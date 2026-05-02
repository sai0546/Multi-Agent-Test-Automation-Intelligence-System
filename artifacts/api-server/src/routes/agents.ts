import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function formatAgent(agent: typeof agentsTable.$inferSelect) {
  return {
    ...agent,
    currentTaskId: agent.currentTaskId ?? null,
    lastHeartbeat: agent.lastHeartbeat.toISOString(),
    createdAt: agent.createdAt.toISOString(),
  };
}

router.get("/agents", async (_req, res) => {
  const agents = await db.select().from(agentsTable);
  res.json({ items: agents.map(formatAgent) });
});

router.get("/agents/:id", async (req, res) => {
  const agent = await db.select().from(agentsTable).where(eq(agentsTable.id, req.params.id)).then((r) => r[0]);
  if (!agent) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatAgent(agent));
});

export default router;
