import { useGetMetricsSummary, getGetMetricsSummaryQueryKey, useGetThroughputMetrics, useGetFailureBreakdown } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Bug, Clock, Cpu, CheckCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function Dashboard() {
  const { data: metrics, isLoading: isMetricsLoading } = useGetMetricsSummary({
    query: { refetchInterval: 30000 }
  });
  
  const { data: throughput } = useGetThroughputMetrics();
  const { data: breakdown } = useGetFailureBreakdown();

  if (isMetricsLoading) return <div className="p-8 text-muted-foreground">Loading telemetry...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase text-primary mb-1">System Telemetry</h1>
        <p className="text-muted-foreground">Live status for test automation agents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Pipelines" value={metrics?.activePipelines} icon={<Activity className="text-primary w-4 h-4" />} />
        <MetricCard title="Failures Analyzed" value={metrics?.totalFailuresAnalyzed} icon={<AlertTriangle className="text-yellow-500 w-4 h-4" />} />
        <MetricCard title="Bugs Filed" value={metrics?.totalBugsFiled} icon={<Bug className="text-destructive w-4 h-4" />} />
        <MetricCard title="Agents Healthy" value={`${metrics?.agentHealthy} / ${Number(metrics?.agentHealthy || 0) + Number(metrics?.agentDegraded || 0)}`} icon={<Cpu className="text-green-500 w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Throughput (24h)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {throughput && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={throughput.dataPoints}>
                  <XAxis dataKey="hour" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                  <Line type="monotone" dataKey="pipelinesRun" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Failure Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {breakdown && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown.byType}>
                  <XAxis dataKey="errorType" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: any; icon: React.ReactNode }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium uppercase text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value ?? '-'}</div>
      </CardContent>
    </Card>
  );
}
