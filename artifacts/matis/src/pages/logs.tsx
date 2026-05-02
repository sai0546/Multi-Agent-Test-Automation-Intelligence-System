import { useListLogs } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TerminalSquare } from "lucide-react";

export default function Logs() {
  const { data, isLoading } = useListLogs();

  if (isLoading) return <div className="p-8 text-muted-foreground font-mono">Loading trace stream...</div>;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-destructive border-destructive';
      case 'warn': return 'text-yellow-500 border-yellow-500';
      case 'info': return 'text-primary border-primary';
      default: return 'text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-3rem)]">
      <div>
        <h1 className="text-2xl font-bold uppercase text-primary mb-1 flex items-center gap-2">
          <TerminalSquare className="w-6 h-6" /> Trace Stream
        </h1>
        <p className="text-muted-foreground">Structured telemetry logs from all agents.</p>
      </div>

      <div className="flex-1 bg-black border border-border rounded-md overflow-hidden flex flex-col">
        <div className="bg-card/50 border-b border-border p-2 px-4 flex gap-4 text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
          <div className="w-32">Timestamp</div>
          <div className="w-16">Level</div>
          <div className="w-32">Agent</div>
          <div className="w-24">Trace ID</div>
          <div className="flex-1">Message</div>
          <div className="w-20 text-right">Latency</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm">
          {data?.items.map((log) => (
            <div key={log.id} className="flex gap-4 hover:bg-card/30 p-1 rounded transition-colors group">
              <div className="w-32 text-muted-foreground whitespace-nowrap">
                {format(new Date(log.createdAt), "HH:mm:ss.SSS")}
              </div>
              <div className="w-16">
                <span className={`uppercase text-[10px] px-1 py-0.5 rounded border ${getLevelColor(log.level)}`}>
                  {log.level}
                </span>
              </div>
              <div className="w-32 text-blue-400 whitespace-nowrap overflow-hidden text-ellipsis">
                {log.agentType || '-'}
              </div>
              <div className="w-24 text-muted-foreground text-xs">
                {log.traceId ? log.traceId.substring(0,8) : '-'}
              </div>
              <div className="flex-1 text-foreground break-words">
                {log.message}
              </div>
              <div className="w-20 text-right text-muted-foreground whitespace-nowrap">
                {log.latencyMs ? `${log.latencyMs}ms` : '-'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
