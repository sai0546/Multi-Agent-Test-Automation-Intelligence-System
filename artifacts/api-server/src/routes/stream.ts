import { Router } from "express";
import { db } from "@workspace/db";
import { pipelinesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreateBus, type PipelineEvent } from "../lib/pipelineEvents.js";

const router = Router();

/**
 * GET /api/pipelines/:id/stream
 * Server-Sent Events endpoint for real-time pipeline progress.
 * Clients subscribe immediately after pipeline creation and receive
 * stage_start / progress / stage_complete / done events.
 */
router.get("/pipelines/:id/stream", async (req, res) => {
  const { id } = req.params;

  const pipeline = await db
    .select()
    .from(pipelinesTable)
    .where(eq(pipelinesTable.id, id))
    .then((r) => r[0]);

  if (!pipeline) {
    res.status(404).json({ error: "Pipeline not found" });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: PipelineEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // If already completed/failed, send a synthetic done event and close
  if (pipeline.status === "completed" || pipeline.status === "failed") {
    send({
      type: "done",
      pipelineId: id,
      message: `Pipeline ${pipeline.status}`,
      data: { status: pipeline.status },
      timestamp: new Date().toISOString(),
    });
    res.end();
    return;
  }

  // Subscribe to in-process event bus
  const emitter = getOrCreateBus(id);
  const handler = (event: PipelineEvent) => send(event);
  emitter.on("event", handler);

  // Send initial keepalive comment
  res.write(`: connected\n\n`);

  // Keepalive ping every 15s
  const ping = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 15000);

  // Cleanup on client disconnect
  req.on("close", () => {
    clearInterval(ping);
    emitter.off("event", handler);
  });
});

export default router;
