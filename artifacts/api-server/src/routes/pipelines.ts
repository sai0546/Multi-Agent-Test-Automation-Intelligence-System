import { Router } from "express";
import { db } from "@workspace/db";
import {
  pipelinesTable,
  pipelineStagesTable,
  failuresTable,
  bugsTable,
  logEntriesTable,
  agentsTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { runTestGenerator } from "../agents/testGenerator.js";
import { runLogAnalyzer } from "../agents/logAnalyzer.js";
import { runTriageAgent } from "../agents/triageAgent.js";
import { runBugReporter } from "../agents/bugReporter.js";
import { buildEmitter, getOrCreateBus } from "../lib/pipelineEvents.js";
import { withSpan } from "../lib/telemetry.js";

const VALID_INPUT_TYPES = ["source_file", "pytest_json", "git_diff", "log_file"] as const;
const VALID_MODELS = ["claude-3-5-sonnet", "gpt-4o-mini", "claude-3-5-haiku", "gemini-2-flash"] as const;
type InputType = (typeof VALID_INPUT_TYPES)[number];
type Model = (typeof VALID_MODELS)[number];

const STAGE_NAMES = ["test_generation", "log_analysis", "triage", "bug_filing"] as const;
type StageName = (typeof STAGE_NAMES)[number];

const router = Router();

function buildPipelineResponse(
  pipeline: typeof pipelinesTable.$inferSelect,
  stages: (typeof pipelineStagesTable.$inferSelect)[],
) {
  return {
    ...pipeline,
    costUsd: pipeline.costUsd ?? 0,
    errorMessage: pipeline.errorMessage ?? null,
    stages: STAGE_NAMES.map((name) => {
      const stage = stages.find((s) => s.name === name);
      return {
        name,
        status: stage?.status ?? "pending",
        durationMs: stage?.durationMs ?? 0,
        tokensUsed: stage?.tokensUsed ?? 0,
        errorMessage: stage?.errorMessage ?? null,
        startedAt: stage?.startedAt?.toISOString() ?? null,
        completedAt: stage?.completedAt?.toISOString() ?? null,
      };
    }),
    createdAt: pipeline.createdAt.toISOString(),
    updatedAt: pipeline.updatedAt.toISOString(),
  };
}

router.get("/pipelines", async (req, res) => {
  const { status, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 20, 100);
  const off = parseInt(offset) || 0;
  const conditions = status ? [eq(pipelinesTable.status, status)] : [];
  const where = conditions.length ? and(...conditions) : undefined;

  const pipelines = await db
    .select()
    .from(pipelinesTable)
    .where(where)
    .orderBy(desc(pipelinesTable.createdAt))
    .limit(lim)
    .offset(off);

  const allStages = pipelines.length
    ? await db.select().from(pipelineStagesTable)
    : [];

  const total = await db.$count(pipelinesTable, where);

  res.json({
    items: pipelines.map((p) => buildPipelineResponse(p, allStages)),
    total,
  });
});

router.post("/pipelines", async (req, res) => {
  const { inputSource, inputType, model = "claude-3-5-sonnet", dryRun = false } = req.body as {
    inputSource?: string;
    inputType?: string;
    model?: string;
    dryRun?: boolean;
  };

  if (!inputSource || typeof inputSource !== "string" || inputSource.trim() === "") {
    res.status(400).json({ error: "inputSource is required" });
    return;
  }
  if (!inputType || !VALID_INPUT_TYPES.includes(inputType as InputType)) {
    res.status(400).json({ error: `inputType must be one of: ${VALID_INPUT_TYPES.join(", ")}` });
    return;
  }

  const safeModel: Model = VALID_MODELS.includes(model as Model)
    ? (model as Model)
    : "claude-3-5-sonnet";

  const id = randomUUID();
  const now = new Date();

  await db.insert(pipelinesTable).values({
    id,
    status: "running",
    inputSource,
    inputType,
    model: safeModel,
    dryRun: Boolean(dryRun),
    testsGenerated: 0,
    failuresAnalyzed: 0,
    bugsFiledCount: 0,
    tokensUsed: 0,
    costUsd: 0,
    durationMs: 0,
    createdAt: now,
    updatedAt: now,
  });

  for (const name of STAGE_NAMES) {
    await db.insert(pipelineStagesTable).values({
      id: randomUUID(),
      pipelineId: id,
      name,
      status: name === "test_generation" ? "running" : "pending",
      durationMs: 0,
      tokensUsed: 0,
    });
  }

  // Prime the event bus before responding so SSE clients can connect
  getOrCreateBus(id);

  // Start real agent pipeline in background
  void runAgentPipeline(id, safeModel, inputType as InputType, inputSource);

  const pipeline = await db
    .select()
    .from(pipelinesTable)
    .where(eq(pipelinesTable.id, id))
    .then((r) => r[0]);
  const stages = await db
    .select()
    .from(pipelineStagesTable)
    .where(eq(pipelineStagesTable.pipelineId, id));

  res.status(201).json(buildPipelineResponse(pipeline, stages));
});

router.get("/pipelines/:id", async (req, res) => {
  const pipeline = await db
    .select()
    .from(pipelinesTable)
    .where(eq(pipelinesTable.id, req.params.id))
    .then((r) => r[0]);
  if (!pipeline) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const stages = await db
    .select()
    .from(pipelineStagesTable)
    .where(eq(pipelineStagesTable.pipelineId, pipeline.id));
  res.json(buildPipelineResponse(pipeline, stages));
});

router.post("/pipelines/:id/cancel", async (req, res) => {
  const pipeline = await db
    .select()
    .from(pipelinesTable)
    .where(eq(pipelinesTable.id, req.params.id))
    .then((r) => r[0]);
  if (!pipeline) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (pipeline.status === "running" || pipeline.status === "pending") {
    await db
      .update(pipelinesTable)
      .set({ status: "failed", errorMessage: "Cancelled by user", updatedAt: new Date() })
      .where(eq(pipelinesTable.id, pipeline.id));
    await db
      .update(pipelineStagesTable)
      .set({ status: "skipped" })
      .where(
        and(
          eq(pipelineStagesTable.pipelineId, pipeline.id),
          eq(pipelineStagesTable.status, "pending"),
        ),
      );
  }
  const updated = await db
    .select()
    .from(pipelinesTable)
    .where(eq(pipelinesTable.id, req.params.id))
    .then((r) => r[0]);
  const stages = await db
    .select()
    .from(pipelineStagesTable)
    .where(eq(pipelineStagesTable.pipelineId, pipeline.id));
  res.json(buildPipelineResponse(updated, stages));
});

// ─── Real Agent Pipeline Orchestrator ────────────────────────────────────────

async function runAgentPipeline(
  pipelineId: string,
  _model: Model,
  inputType: InputType,
  inputSource: string,
) {
  const emit = buildEmitter(pipelineId);
  const traceId = randomUUID().slice(0, 16);
  let totalTokens = 0;
  let totalDurationMs = 0;

  await withSpan(
    "pipeline.run",
    { "pipeline.id": pipelineId, "pipeline.input_type": inputType, "trace.id": traceId },
    async () => {
      try {
        // ── Stage 1: Test Generator ──────────────────────────────────────────
        emit("stage_start", "test_generation", "Test Generator agent starting...");
        const stageStart1 = Date.now();

        const testResult = await runTestGenerator(
          inputSource,
          inputType,
          pipelineId,
          traceId,
          (msg) => emit("progress", "test_generation", msg),
        );

        await updateStage(pipelineId, "test_generation", "completed", {
          durationMs: testResult.durationMs,
          tokensUsed: testResult.tokensUsed,
        });
        await updateNextStage(pipelineId, "log_analysis");

        totalTokens += testResult.tokensUsed;
        totalDurationMs += testResult.durationMs;

        emit("stage_complete", "test_generation", `Generated ${testResult.testsGenerated} tests`, {
          testsGenerated: testResult.testsGenerated,
          coverageSummary: testResult.coverageSummary,
          tokensUsed: testResult.tokensUsed,
          durationMs: testResult.durationMs,
        });

        await logEntry(pipelineId, traceId, "test_generator", "info",
          `Test Generator: generated ${testResult.testsGenerated} tests — ${testResult.coverageSummary}`,
          { latencyMs: testResult.durationMs, tokensUsed: testResult.tokensUsed });

        await db.update(pipelinesTable).set({
          testsGenerated: testResult.testsGenerated,
          tokensUsed: totalTokens,
          durationMs: totalDurationMs,
          updatedAt: new Date(),
        }).where(eq(pipelinesTable.id, pipelineId));

        // ── Stage 2: Log Analyzer ────────────────────────────────────────────
        emit("stage_start", "log_analysis", "Log Analyzer agent starting...");

        const analyzerResult = await runLogAnalyzer(
          inputSource,
          inputType,
          testResult.testNames,
          pipelineId,
          traceId,
          (msg) => emit("progress", "log_analysis", msg),
        );

        await updateStage(pipelineId, "log_analysis", "completed", {
          durationMs: analyzerResult.durationMs,
          tokensUsed: analyzerResult.tokensUsed,
        });
        await updateNextStage(pipelineId, "triage");

        totalTokens += analyzerResult.tokensUsed;
        totalDurationMs += analyzerResult.durationMs;

        emit("stage_complete", "log_analysis", `Found ${analyzerResult.failures.length} failures`, {
          failuresFound: analyzerResult.failures.length,
          precision: analyzerResult.precision,
          recall: analyzerResult.recall,
          tokensUsed: analyzerResult.tokensUsed,
        });

        await logEntry(pipelineId, traceId, "log_analyzer", "warn",
          `Log Analyzer: found ${analyzerResult.failures.length} failure(s) — precision=${analyzerResult.precision.toFixed(2)} recall=${analyzerResult.recall.toFixed(2)}`,
          { latencyMs: analyzerResult.durationMs, tokensUsed: analyzerResult.tokensUsed });

        await db.update(pipelinesTable).set({
          failuresAnalyzed: analyzerResult.failures.length,
          tokensUsed: totalTokens,
          durationMs: totalDurationMs,
          updatedAt: new Date(),
        }).where(eq(pipelinesTable.id, pipelineId));

        // ── Stage 3: Triage Agent ────────────────────────────────────────────
        emit("stage_start", "triage", "Triage Agent prioritizing failures...");

        const triageResult = await runTriageAgent(
          analyzerResult.failures,
          pipelineId,
          traceId,
          (msg) => emit("progress", "triage", msg),
        );

        await updateStage(pipelineId, "triage", "completed", {
          durationMs: triageResult.durationMs,
          tokensUsed: triageResult.tokensUsed,
        });
        await updateNextStage(pipelineId, "bug_filing");

        totalTokens += triageResult.tokensUsed;
        totalDurationMs += triageResult.durationMs;

        emit("stage_complete", "triage", `Triaged ${triageResult.failures.length} failures`, {
          f1Score: triageResult.f1Score,
          duplicates: triageResult.failures.filter((f) => f.isDuplicate).length,
        });

        await logEntry(pipelineId, traceId, "triage", "info",
          `Triage Agent: F1=${triageResult.f1Score.toFixed(3)}, ${triageResult.failures.filter((f) => f.isDuplicate).length} duplicate(s) found`,
          { latencyMs: triageResult.durationMs, tokensUsed: triageResult.tokensUsed });

        // Persist failures to DB
        for (const f of triageResult.failures) {
          const fid = randomUUID();
          await db.insert(failuresTable).values({
            id: fid,
            pipelineId,
            errorType: f.errorType,
            severity: f.severity,
            status: f.isDuplicate ? "duplicate" : "triaged",
            rootCause: f.rootCause,
            affectedFiles: JSON.stringify(f.affectedFiles),
            suggestedFix: f.suggestedFix,
            priority: f.priority,
            isDuplicate: f.isDuplicate,
            isRegression: f.isRegression,
            rawLog: f.rawLog,
          });
        }

        // ── Stage 4: Bug Reporter ────────────────────────────────────────────
        emit("stage_start", "bug_filing", "Bug Reporter filing issues...");

        const bugResult = await runBugReporter(
          triageResult.failures,
          pipelineId,
          traceId,
          (msg) => emit("progress", "bug_filing", msg),
        );

        await updateStage(pipelineId, "bug_filing", "completed", {
          durationMs: bugResult.durationMs,
          tokensUsed: bugResult.tokensUsed,
        });

        totalTokens += bugResult.tokensUsed;
        totalDurationMs += bugResult.durationMs;

        emit("stage_complete", "bug_filing", `Filed ${bugResult.bugs.length} bug report(s)`, {
          bugsFiledCount: bugResult.bugs.length,
          successRate: bugResult.successRate,
        });

        await logEntry(pipelineId, traceId, "bug_reporter", "info",
          `Bug Reporter: filed ${bugResult.bugs.length} issue(s), success_rate=${bugResult.successRate.toFixed(2)}`,
          { latencyMs: bugResult.durationMs, tokensUsed: bugResult.tokensUsed });

        // Persist bugs to DB and link to failures
        let bugsFiledCount = 0;
        for (const bug of bugResult.bugs) {
          const bid = randomUUID();
          const failure = triageResult.failures.find(
            (f) => f.severity === bug.severity && !f.isDuplicate,
          );

          await db.insert(bugsTable).values({
            id: bid,
            failureId: null,
            pipelineId,
            title: bug.title,
            body: bug.body,
            labels: JSON.stringify(bug.labels),
            assignee: null,
            status: bug.status,
            githubIssueUrl: bug.githubIssueUrl,
            githubIssueNumber: bug.githubIssueNumber,
            retryCount: 0,
          });

          if (failure) {
            const dbFailure = await db
              .select()
              .from(failuresTable)
              .where(
                and(
                  eq(failuresTable.pipelineId, pipelineId),
                  eq(failuresTable.severity, bug.severity),
                ),
              )
              .then((r) => r[0]);

            if (dbFailure) {
              await db
                .update(failuresTable)
                .set({ bugId: bid, status: "filed" })
                .where(eq(failuresTable.id, dbFailure.id));
            }
          }

          if (bug.status === "filed") bugsFiledCount++;
        }

        // ── Finalize pipeline ────────────────────────────────────────────────
        const costUsd = parseFloat((totalTokens * 0.000003).toFixed(4));
        await db.update(pipelinesTable).set({
          status: "completed",
          testsGenerated: testResult.testsGenerated,
          failuresAnalyzed: triageResult.failures.length,
          bugsFiledCount,
          tokensUsed: totalTokens,
          costUsd,
          durationMs: totalDurationMs,
          updatedAt: new Date(),
        }).where(eq(pipelinesTable.id, pipelineId));

        // Update all agents' stats
        const agentsList = await db.select().from(agentsTable);
        for (const agent of agentsList) {
          await db.update(agentsTable).set({
            tasksCompleted: agent.tasksCompleted + 1,
            totalTokensUsed: agent.totalTokensUsed + Math.floor(totalTokens / 4),
            lastHeartbeat: new Date(),
          }).where(eq(agentsTable.id, agent.id));
        }

        emit("done", undefined, "Pipeline completed successfully", {
          status: "completed",
          testsGenerated: testResult.testsGenerated,
          failuresAnalyzed: triageResult.failures.length,
          bugsFiledCount,
          tokensUsed: totalTokens,
          costUsd,
          durationMs: totalDurationMs,
        });

      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await db.update(pipelinesTable).set({
          status: "failed",
          errorMessage: message,
          tokensUsed: totalTokens,
          durationMs: totalDurationMs,
          updatedAt: new Date(),
        }).where(eq(pipelinesTable.id, pipelineId));

        await logEntry(pipelineId, traceId, null, "error",
          `Pipeline failed: ${message}`, { latencyMs: totalDurationMs });

        emit("error", undefined, message, { status: "failed" });
      }
    },
  );
}

async function updateStage(
  pipelineId: string,
  name: StageName,
  status: "completed" | "failed",
  data: { durationMs: number; tokensUsed: number; errorMessage?: string },
) {
  await db
    .update(pipelineStagesTable)
    .set({
      status,
      durationMs: data.durationMs,
      tokensUsed: data.tokensUsed,
      completedAt: new Date(),
      errorMessage: data.errorMessage ?? null,
    })
    .where(
      and(
        eq(pipelineStagesTable.pipelineId, pipelineId),
        eq(pipelineStagesTable.name, name),
      ),
    );
}

async function updateNextStage(pipelineId: string, name: StageName) {
  await db
    .update(pipelineStagesTable)
    .set({ status: "running", startedAt: new Date() })
    .where(
      and(
        eq(pipelineStagesTable.pipelineId, pipelineId),
        eq(pipelineStagesTable.name, name),
      ),
    );
}

async function logEntry(
  pipelineId: string,
  traceId: string,
  agentType: string | null,
  level: "info" | "warn" | "error",
  message: string,
  extras: { latencyMs?: number; tokensUsed?: number } = {},
) {
  await db.insert(logEntriesTable).values({
    id: randomUUID(),
    level,
    message,
    pipelineId,
    agentType,
    traceId,
    latencyMs: extras.latencyMs ?? null,
    tokensUsed: extras.tokensUsed ?? null,
  });
}

export default router;
