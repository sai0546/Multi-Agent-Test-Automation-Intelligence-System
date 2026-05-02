import { Router } from "express";
import { db } from "@workspace/db";
import {
  pipelinesTable,
  agentsTable,
  failuresTable,
  bugsTable,
  evalRunsTable,
} from "@workspace/db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

const router = Router();

router.get("/metrics/summary", async (_req, res) => {
  const [
    allPipelines,
    allAgents,
    allFailures,
    allBugs,
    lastEval,
  ] = await Promise.all([
    db.select().from(pipelinesTable),
    db.select().from(agentsTable),
    db.select().from(failuresTable),
    db.select().from(bugsTable),
    db.select().from(evalRunsTable).orderBy(desc(evalRunsTable.createdAt)).limit(1).then((r) => r[0] ?? null),
  ]);

  const activePipelines = allPipelines.filter((p) => p.status === "running" || p.status === "pending").length;
  const completedPipelines = allPipelines.filter((p) => p.status === "completed");
  const successRate = allPipelines.length > 0
    ? parseFloat((completedPipelines.length / allPipelines.length * 100).toFixed(1))
    : 0;

  const avgDuration = completedPipelines.length > 0
    ? Math.floor(completedPipelines.reduce((s, p) => s + (p.durationMs ?? 0), 0) / completedPipelines.length)
    : 0;

  const totalTokens = allPipelines.reduce((s, p) => s + (p.tokensUsed ?? 0), 0);
  const totalCost = allPipelines.reduce((s, p) => s + (p.costUsd ?? 0), 0);

  const agentHealthy = allAgents.filter((a) => a.status === "idle" || a.status === "busy").length;
  const agentDegraded = allAgents.filter((a) => a.status === "error" || a.status === "circuit_open").length;

  const lastScore = lastEval?.triageF1Score
    ? parseFloat(lastEval.triageF1Score.toFixed(3))
    : null;

  res.json({
    totalPipelines: allPipelines.length,
    activePipelines,
    totalFailuresAnalyzed: allFailures.length,
    totalBugsFiled: allBugs.filter((b) => b.status === "filed").length,
    avgPipelineDurationMs: avgDuration,
    totalTokensUsed: totalTokens,
    totalCostUsd: parseFloat(totalCost.toFixed(4)),
    successRate,
    agentHealthy,
    agentDegraded,
    lastEvalScore: lastScore,
  });
});

router.get("/metrics/throughput", async (_req, res) => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pipelines = await db.select().from(pipelinesTable).where(gte(pipelinesTable.createdAt, cutoff));
  const bugs = await db.select().from(bugsTable).where(gte(bugsTable.createdAt, cutoff));
  const failures = await db.select().from(failuresTable).where(gte(failuresTable.createdAt, cutoff));

  const hours: Record<string, { pipelinesRun: number; failuresAnalyzed: number; bugsFiledCount: number }> = {};

  for (let i = 23; i >= 0; i--) {
    const d = new Date(Date.now() - i * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 13) + ":00:00Z";
    hours[key] = { pipelinesRun: 0, failuresAnalyzed: 0, bugsFiledCount: 0 };
  }

  for (const p of pipelines) {
    const key = p.createdAt.toISOString().slice(0, 13) + ":00:00Z";
    if (hours[key]) hours[key].pipelinesRun++;
  }
  for (const f of failures) {
    const key = f.createdAt.toISOString().slice(0, 13) + ":00:00Z";
    if (hours[key]) hours[key].failuresAnalyzed++;
  }
  for (const b of bugs.filter((b) => b.status === "filed")) {
    const key = b.createdAt.toISOString().slice(0, 13) + ":00:00Z";
    if (hours[key]) hours[key].bugsFiledCount++;
  }

  res.json({
    dataPoints: Object.entries(hours).map(([hour, vals]) => ({ hour, ...vals })),
  });
});

router.get("/metrics/agents", async (_req, res) => {
  const agents = await db.select().from(agentsTable);
  res.json({
    items: agents.map((a) => ({
      agentId: a.id,
      agentName: a.name,
      agentType: a.type,
      avgLatencyMs: a.avgLatencyMs,
      p95LatencyMs: a.p95LatencyMs,
      totalTasks: a.tasksCompleted + a.tasksFailed,
      successRate: a.tasksCompleted + a.tasksFailed > 0
        ? parseFloat((a.tasksCompleted / (a.tasksCompleted + a.tasksFailed) * 100).toFixed(1))
        : 100,
      totalTokens: a.totalTokensUsed,
      circuitBreakerTrips: a.circuitBreakerTrips,
    })),
  });
});

router.get("/metrics/failure-breakdown", async (_req, res) => {
  const failures = await db.select().from(failuresTable);

  const byTypeMap: Record<string, Record<string, number>> = {};
  const bySeverityMap: Record<string, number> = {};

  for (const f of failures) {
    if (!byTypeMap[f.errorType]) byTypeMap[f.errorType] = {};
    byTypeMap[f.errorType][f.severity] = (byTypeMap[f.errorType][f.severity] || 0) + 1;
    bySeverityMap[f.severity] = (bySeverityMap[f.severity] || 0) + 1;
  }

  const byType = Object.entries(byTypeMap).flatMap(([errorType, sev]) =>
    Object.entries(sev).map(([severity, count]) => ({ errorType, severity, count }))
  );

  const bySeverity = Object.entries(bySeverityMap).map(([severity, count]) => ({ severity, count }));

  res.json({ byType, bySeverity });
});

export default router;
