import { Router } from "express";
import { db } from "@workspace/db";
import { failuresTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

function formatFailure(f: typeof failuresTable.$inferSelect) {
  return {
    ...f,
    affectedFiles: JSON.parse(f.affectedFiles || "[]") as string[],
    duplicateOfId: f.duplicateOfId ?? null,
    bugId: f.bugId ?? null,
    createdAt: f.createdAt.toISOString(),
  };
}

router.get("/failures", async (req, res) => {
  const { pipelineId, severity, status, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 20, 100);
  const off = parseInt(offset) || 0;

  const conditions = [];
  if (pipelineId) conditions.push(eq(failuresTable.pipelineId, pipelineId));
  if (severity) conditions.push(eq(failuresTable.severity, severity));
  if (status) conditions.push(eq(failuresTable.status, status));

  const where = conditions.length ? and(...conditions) : undefined;
  const failures = await db.select().from(failuresTable).where(where).orderBy(desc(failuresTable.createdAt)).limit(lim).offset(off);
  const total = await db.$count(failuresTable, where);

  res.json({ items: failures.map(formatFailure), total });
});

router.get("/failures/:id", async (req, res) => {
  const failure = await db.select().from(failuresTable).where(eq(failuresTable.id, req.params.id)).then((r) => r[0]);
  if (!failure) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatFailure(failure));
});

export default router;
