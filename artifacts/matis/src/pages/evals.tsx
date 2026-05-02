import { useListEvals, useRunEval, getListEvalsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Evals() {
  const { data, isLoading } = useListEvals();
  const runEval = useRunEval();
  const queryClient = useQueryClient();

  const handleRunEval = () => {
    runEval.mutate({ data: {} }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEvalsQueryKey() });
      }
    });
  };

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading evals...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold uppercase text-primary mb-1">Evaluation Harness</h1>
          <p className="text-muted-foreground">Performance metrics for agent pipelines over time.</p>
        </div>
        <Button onClick={handleRunEval} disabled={runEval.isPending} className="gap-2">
          {runEval.isPending ? <Activity className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
          Run Evaluation
        </Button>
      </div>

      <div className="grid gap-4">
        {data?.items.map((run) => (
          <Card key={run.id} className="bg-card border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border/50">
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <span className="font-bold text-foreground">{run.id.substring(0,8)}</span>
                <span>•</span>
                <span>{format(new Date(run.createdAt), "MMM d, yyyy HH:mm")}</span>
              </div>
              <Badge variant="outline" className="border-border uppercase">{run.status}</Badge>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Test Gen Coverage</div>
                <div className="text-xl font-bold text-primary">{run.testGenCoveragePercent.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Log Analyzer Precision</div>
                <div className="text-xl font-bold">{(run.logAnalyzerPrecision * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Log Analyzer Recall</div>
                <div className="text-xl font-bold">{(run.logAnalyzerRecall * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Triage F1 Score</div>
                <div className="text-xl font-bold text-green-400">{(run.triageF1Score * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Bug Filing Success</div>
                <div className="text-xl font-bold">{(run.bugFilingSuccessRate * 100).toFixed(1)}%</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
