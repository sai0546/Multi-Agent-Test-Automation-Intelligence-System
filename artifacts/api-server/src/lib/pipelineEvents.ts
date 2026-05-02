import { EventEmitter } from "events";

export interface PipelineEvent {
  type: "stage_start" | "stage_complete" | "stage_fail" | "progress" | "done" | "error";
  pipelineId: string;
  stage?: string;
  message?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

// Global in-process event bus keyed by pipelineId
const bus = new Map<string, EventEmitter>();

export function getOrCreateBus(pipelineId: string): EventEmitter {
  if (!bus.has(pipelineId)) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(20);
    bus.set(pipelineId, emitter);
    // Auto-clean after 10 minutes
    setTimeout(() => bus.delete(pipelineId), 10 * 60 * 1000);
  }
  return bus.get(pipelineId)!;
}

export function emitPipelineEvent(event: PipelineEvent): void {
  const emitter = bus.get(event.pipelineId);
  if (emitter) {
    emitter.emit("event", event);
  }
}

export function buildEmitter(pipelineId: string) {
  return (
    type: PipelineEvent["type"],
    stage?: string,
    message?: string,
    data?: Record<string, unknown>,
  ) => {
    emitPipelineEvent({
      type,
      pipelineId,
      stage,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  };
}
