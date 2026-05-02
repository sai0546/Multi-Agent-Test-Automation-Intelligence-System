import { useGetPipeline, useCancelPipeline, getGetPipelineQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  StopCircle, CheckCircle, Activity, AlertCircle, Clock,
  SkipForward, Zap, Bot, FileSearch, Siren, Bug, Cpu
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePipelineStream } from "@/hooks/usePipelineStream";
import { useEffect, useRef } from "react";

const STAGE_META: Record<string, { label: string; icon: React.ReactNode; agentName: string }> = {
  test_generation: { label: "Test Generator", icon: <Bot className="w-5 h-5" />, agentName: "Claude Test Generator" },
  log_analysis:   { label: "Log Analyzer",   icon: <FileSearch className="w-5 h-5" />, agentName: "Claude Log Analyzer" },
  triage:         { label: "Triage Agent",   icon: <Siren className="w-5 h-5" />, agentName: "Claude Triage Agent" },
  bug_filing:     { label: "Bug Reporter",   icon: <Bug className="w-5 h-5" />, agentName: "Claude Bug Reporter" },
};

function getStageIcon(status: string, stageName: string) {
  const meta = STAGE_META[stageName];
  switch (status) {
    case "completed": return <CheckCircle className="text-green-500 w-5 h-5 shrink-0" />;
    case "running":   return <Activity className="text-primary w-5 h-5 animate-pulse shrink-0" />;
    case "failed":    return <AlertCircle className="text-destructive w-5 h-5 shrink-0" />;
    case "skipped":   return <SkipForward className="text-muted-foreground w-5 h-5 shrink-0" />;
    default:          return meta?.icon
      ? <span className="text-muted-foreground/40 w-5 h-5 shrink-0">{meta.icon}</span>
      : <Clock className="text-muted-foreground/40 w-5 h-5 shrink-0" />;
  }
}

export default function PipelineDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { data: pipeline, isLoading } = useGetPipeline(id!, {
    query: {
      enabled: !!id,
      queryKey: getGetPipelineQueryKey(id!),
      refetchInterval: (q) =>
        q.state.data?.status === "running" || q.state.data?.status === "pending" ? 3000 : false,
    },
  });
  const cancelPipeline = useCancelPipeline();

  const isRunning = pipeline?.status === "running" || pipeline?.status === "pending";

  // SSE live stream — only active while pipeline is running
  const stream = usePipelineStream(id ?? null, isRunning);

  // Auto-refetch from API when SSE signals done
  useEffect(() => {
    if (stream.isDone) {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: getGetPipelineQueryKey(id!) });
      }, 800);
    }
  }, [stream.isDone, id, queryClient]);

  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [stream.events.length]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading pipeline…</div>;
  if (!pipeline) return <div className="p-8 text-destructive">Pipeline not found.</div>;

  const handleCancel = () => {
    cancelPipeline.mutate({ id: pipeline.id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPipelineQueryKey(pipeline.id) }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold uppercase text-primary mb-1 flex items-center gap-2">
            <Cpu className="w-6 h-6" />
            Pipeline {pipeline.id.substring(0, 8)}
          </h1>
          <p className="text-muted-foreground font-mono text-sm">{pipeline.inputSource}</p>
        </div>
        <div className="flex items-center gap-3">
          {stream.isConnected && isRunning && (
            <Badge className="animate-pulse bg-green-500/20 text-green-400 border-green-500/30">
              <Zap className="w-3 h-3 mr-1" /> LIVE
            </Badge>
          )}
          <Badge variant="outline" className="border-border uppercase">{pipeline.status}</Badge>
          {isRunning && (
            <Button variant="destructive" size="sm" onClick={handleCancel} disabled={cancelPipeline.isPending}>
              <StopCircle className="w-4 h-4 mr-2" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Model", value: pipeline.model },
          { label: "Cost", value: `$${pipeline.costUsd.toFixed(4)}`, className: "text-green-400" },
          { label: "Tokens", value: pipeline.tokensUsed.toLocaleString() },
          { label: "Duration", value: `${(pipeline.durationMs / 1000).toFixed(2)}s` },
          { label: "Tests Generated", value: pipeline.testsGenerated },
        ].map(({ label, value, className }) => (
          <Card key={label} className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`font-bold font-mono ${className ?? ""}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Agent Stages */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Agent Execution</h2>
          {pipeline.stages.map((stage) => {
            const meta = STAGE_META[stage.name];
            const stageMessages = stream.stageMessages[stage.name] ?? [];
            const isActive = stream.activeStage === stage.name;

            return (
              <Card
                key={stage.name}
                className={`bg-card border-border transition-all ${
                  isActive ? "border-primary/60 shadow-lg shadow-primary/10" : ""
                } ${stage.status === "completed" ? "border-green-500/20" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getStageIcon(stage.status, stage.name)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold uppercase text-sm tracking-wide">
                            {meta?.label ?? stage.name}
                          </span>
                          {meta?.agentName && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {meta.agentName}
                            </span>
                          )}
                          {isActive && (
                            <Badge className="text-[9px] bg-primary/20 text-primary border-primary/30 animate-pulse">
                              RUNNING
                            </Badge>
                          )}
                        </div>
                        {stage.errorMessage && (
                          <div className="text-xs text-destructive mt-1 font-mono">{stage.errorMessage}</div>
                        )}
                        {/* Live progress messages for this stage */}
                        {stageMessages.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {stageMessages.map((msg, i) => (
                              <div key={i} className="text-xs text-muted-foreground font-mono flex items-start gap-1">
                                <span className="text-primary/50 shrink-0">›</span>
                                <span>{msg}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-6 text-sm text-right shrink-0">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[10px] uppercase">Tokens</span>
                        <span className="font-bold font-mono">{stage.tokensUsed.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[10px] uppercase">Duration</span>
                        <span className="font-bold font-mono">{(stage.durationMs / 1000).toFixed(1)}s</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Live Event Stream */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Live Event Stream
            {stream.isConnected && (
              <span className="ml-2 text-green-400 text-[10px]">● connected</span>
            )}
          </h2>
          <div
            ref={logRef}
            className="bg-black/40 border border-border rounded-lg p-3 h-[380px] overflow-y-auto font-mono text-xs space-y-1"
          >
            {stream.events.length === 0 ? (
              <div className="text-muted-foreground/50 italic">
                {isRunning ? "Connecting to event stream…" : "Pipeline not running. Start a pipeline to see live events."}
              </div>
            ) : (
              stream.events.map((evt, i) => (
                <div
                  key={i}
                  className={`flex gap-2 items-start ${
                    evt.type === "error" ? "text-destructive" :
                    evt.type === "done" ? "text-green-400" :
                    evt.type === "stage_start" ? "text-primary" :
                    evt.type === "stage_complete" ? "text-green-300" :
                    "text-muted-foreground"
                  }`}
                >
                  <span className="text-muted-foreground/40 shrink-0">
                    {format(new Date(evt.timestamp), "HH:mm:ss.SSS")}
                  </span>
                  <span className={`shrink-0 uppercase text-[9px] font-bold px-1 rounded ${
                    evt.type === "stage_start" ? "bg-primary/20 text-primary" :
                    evt.type === "stage_complete" ? "bg-green-500/20 text-green-400" :
                    evt.type === "error" ? "bg-red-500/20 text-red-400" :
                    evt.type === "done" ? "bg-green-500/20 text-green-400" :
                    "bg-muted/40 text-muted-foreground"
                  }`}>
                    {evt.type.replace("_", " ")}
                  </span>
                  <span className="break-all">{evt.message}</span>
                </div>
              ))
            )}
          </div>

          {/* Summary data panel when done */}
          {stream.isDone && stream.events.length > 0 && (() => {
            const doneEvent = stream.events.find(e => e.type === "done");
            if (!doneEvent?.data) return null;
            const d = doneEvent.data;
            return (
              <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-xs font-mono">
                <div className="text-green-400 font-bold mb-2 uppercase">Pipeline Complete</div>
                <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                  <span>Tests generated</span><span className="text-foreground">{String(d.testsGenerated ?? 0)}</span>
                  <span>Failures found</span><span className="text-foreground">{String(d.failuresAnalyzed ?? 0)}</span>
                  <span>Bugs filed</span><span className="text-foreground">{String(d.bugsFiledCount ?? 0)}</span>
                  <span>Tokens used</span><span className="text-foreground">{Number(d.tokensUsed ?? 0).toLocaleString()}</span>
                  <span>Cost</span><span className="text-green-400">${Number(d.costUsd ?? 0).toFixed(4)}</span>
                  <span>Duration</span><span className="text-foreground">{(Number(d.durationMs ?? 0) / 1000).toFixed(1)}s</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Error state */}
      {pipeline.errorMessage && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4">
            <div className="text-destructive font-bold text-sm mb-1">Pipeline Error</div>
            <div className="text-destructive/80 font-mono text-xs">{pipeline.errorMessage}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
