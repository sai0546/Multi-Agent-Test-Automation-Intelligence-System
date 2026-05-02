import { useEffect, useRef, useState, useCallback } from "react";

export interface PipelineEvent {
  type: "stage_start" | "stage_complete" | "stage_fail" | "progress" | "done" | "error";
  pipelineId: string;
  stage?: string;
  message?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface StreamState {
  events: PipelineEvent[];
  lastMessage: string;
  isConnected: boolean;
  isDone: boolean;
  activeStage: string | null;
  stageMessages: Record<string, string[]>;
}

export function usePipelineStream(pipelineId: string | null, enabled = true) {
  const [state, setState] = useState<StreamState>({
    events: [],
    lastMessage: "",
    isConnected: false,
    isDone: false,
    activeStage: null,
    stageMessages: {},
  });

  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!pipelineId || !enabled) return;

    const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    const url = `${basePath}/api/pipelines/${pipelineId}/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setState((s) => ({ ...s, isConnected: true }));
    };

    es.onmessage = (e) => {
      try {
        const event: PipelineEvent = JSON.parse(e.data as string);

        setState((s) => {
          const stageMessages = { ...s.stageMessages };
          if (event.stage && event.message) {
            stageMessages[event.stage] = [
              ...(stageMessages[event.stage] ?? []),
              event.message,
            ];
          }

          const isDone = event.type === "done" || event.type === "error";
          const activeStage =
            event.type === "stage_start"
              ? (event.stage ?? s.activeStage)
              : event.type === "stage_complete" || event.type === "stage_fail"
                ? null
                : s.activeStage;

          return {
            events: [...s.events, event],
            lastMessage: event.message ?? s.lastMessage,
            isConnected: true,
            isDone,
            activeStage,
            stageMessages,
          };
        });

        if (event.type === "done" || event.type === "error") {
          es.close();
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      setState((s) => ({ ...s, isConnected: false }));
      es.close();
    };
  }, [pipelineId, enabled]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
    };
  }, [connect]);

  return state;
}
