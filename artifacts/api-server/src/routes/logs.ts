import { Router } from "express";
import { db } from "@workspace/db";
import { logEntriesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

function formatLog(l: typeof logEntriesTable.$inferSelect) {
  return {
    ...l,
    agentId: l.agentId ?? null,
    agentType: l.agentType ?? null,
    pipelineId: l.pipelineId ?? null,
    traceId: l.traceId ?? null,
    latencyMs: l.latencyMs ?? null,
    tokensUsed: l.tokensUsed ?? null,
    metadata: l.metadata ?? null,
    createdAt: l.createdAt.toISOString(),
  };
}

router.get("/logs", async (req, res) => {
  const { agentId, pipelineId, level, limit = "50" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 50, 200);

  const conditions = [];
  if (agentId) conditions.push(eq(logEntriesTable.agentId, agentId));
  if (pipelineId) conditions.push(eq(logEntriesTable.pipelineId, pipelineId));
  if (level) conditions.push(eq(logEntriesTable.level, level));

  const where = conditions.length ? and(...conditions) : undefined;
  const logs = await db.select().from(logEntriesTable).where(where).orderBy(desc(logEntriesTable.createdAt)).limit(lim);
  const total = await db.$count(logEntriesTable, where);

  res.json({ items: logs.map(formatLog), total });
});

export default router;
