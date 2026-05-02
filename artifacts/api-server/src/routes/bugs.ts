import { Router } from "express";
import { db } from "@workspace/db";
import { bugsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

function formatBug(b: typeof bugsTable.$inferSelect) {
  return {
    ...b,
    labels: JSON.parse(b.labels || "[]") as string[],
    assignee: b.assignee ?? null,
    githubIssueUrl: b.githubIssueUrl ?? null,
    githubIssueNumber: b.githubIssueNumber ?? null,
    errorMessage: b.errorMessage ?? null,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/bugs", async (req, res) => {
  const { status, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 20, 100);
  const off = parseInt(offset) || 0;

  const where = status ? eq(bugsTable.status, status) : undefined;
  const bugs = await db.select().from(bugsTable).where(where).orderBy(desc(bugsTable.createdAt)).limit(lim).offset(off);
  const total = await db.$count(bugsTable, where);

  res.json({ items: bugs.map(formatBug), total });
});

router.get("/bugs/:id", async (req, res) => {
  const bug = await db.select().from(bugsTable).where(eq(bugsTable.id, req.params.id)).then((r) => r[0]);
  if (!bug) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatBug(bug));
});

export default router;
