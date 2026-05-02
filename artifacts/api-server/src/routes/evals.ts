import { Router } from "express";
import { db } from "@workspace/db";
import { evalRunsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function formatEval(e: typeof evalRunsTable.$inferSelect) {
  return {
    ...e,
    completedAt: e.completedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/evals", async (req, res) => {
  const { limit = "10" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 10, 50);
  const evals = await db.select().from(evalRunsTable).orderBy(desc(evalRunsTable.createdAt)).limit(lim);
  res.json({ items: evals.map(formatEval) });
});

router.post("/evals/run", async (req, res) => {
  const id = randomUUID();
  await db.insert(evalRunsTable).values({
    id,
    status: "running",
    totalCases: 50,
    passedCases: 0,
    failedCases: 0,
    testGenCoveragePercent: 0,
    logAnalyzerPrecision: 0,
    logAnalyzerRecall: 0,
    triageF1Score: 0,
    bugFilingSuccessRate: 0,
    durationMs: 0,
  });

  // Simulate eval run in background
  simulateEval(id);

  const evalRun = await db.select().from(evalRunsTable).where(eq(evalRunsTable.id, id)).then((r) => r[0]);
  res.status(201).json(formatEval(evalRun));
});

router.get("/evals/:id", async (req, res) => {
  const evalRun = await db.select().from(evalRunsTable).where(eq(evalRunsTable.id, req.params.id)).then((r) => r[0]);
  if (!evalRun) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatEval(evalRun));
});

async function simulateEval(id: string) {
  const duration = 8000 + Math.random() * 4000;
  await new Promise((r) => setTimeout(r, duration));

  const passed = Math.floor(40 + Math.random() * 9);
  const failed = 50 - passed;

  await db.update(evalRunsTable).set({
    status: "completed",
    passedCases: passed,
    failedCases: failed,
    testGenCoveragePercent: parseFloat((72 + Math.random() * 15).toFixed(1)),
    logAnalyzerPrecision: parseFloat((0.82 + Math.random() * 0.12).toFixed(3)),
    logAnalyzerRecall: parseFloat((0.79 + Math.random() * 0.14).toFixed(3)),
    triageF1Score: parseFloat((0.85 + Math.random() * 0.10).toFixed(3)),
    bugFilingSuccessRate: parseFloat((0.91 + Math.random() * 0.08).toFixed(3)),
    durationMs: Math.floor(duration),
    completedAt: new Date(),
  }).where(eq(evalRunsTable.id, id));
}

export default router;
