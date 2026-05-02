import { useListAgents, useGetAgentMetrics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Activity, ShieldAlert } from "lucide-react";

export default function Agents() {
  const { data: agents, isLoading } = useListAgents();
  const { data: metrics } = useGetAgentMetrics();

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading agents...</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'text-muted-foreground';
      case 'busy': return 'text-primary';
      case 'error': return 'text-destructive';
      case 'circuit_open': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase text-primary mb-1">Agent Fleet</h1>
        <p className="text-muted-foreground">Status and metrics for all automated agents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents?.items.map((agent) => {
          const m = metrics?.items.find(m => m.agentId === agent.id);
          
          return (
            <Card key={agent.id} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50 mb-4">
                <div className="flex items-center gap-2">
                  <Server className={`w-5 h-5 ${getStatusColor(agent.status)}`} />
                  <CardTitle className="text-lg font-bold">{agent.name}</CardTitle>
                </div>
                <Badge variant="outline" className={`uppercase text-[10px] tracking-wider border-border ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Model</div>
                  <div className="font-mono font-medium">{agent.model}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Circuit Breaker</div>
                  <div className="font-mono flex items-center gap-2">
                    <span className={agent.circuitBreakerState === 'closed' ? 'text-green-500' : 'text-yellow-500'}>
                      {agent.circuitBreakerState}
                    </span>
                    {m && m.circuitBreakerTrips > 0 && <span className="text-muted-foreground">({m.circuitBreakerTrips} trips)</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Tasks (Success/Fail)</div>
                  <div className="font-mono font-medium">{agent.tasksCompleted} / <span className={agent.tasksFailed > 0 ? "text-destructive" : ""}>{agent.tasksFailed}</span></div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Avg Latency</div>
                  <div className="font-mono font-medium">{agent.avgLatencyMs.toFixed(0)}ms</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Total Tokens</div>
                  <div className="font-mono font-medium">{agent.totalTokensUsed.toLocaleString()}</div>
                </div>
                {m && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase mb-1">P95 Latency</div>
                    <div className="font-mono font-medium">{m.p95LatencyMs.toFixed(0)}ms</div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
