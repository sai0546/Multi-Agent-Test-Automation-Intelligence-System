import { useGetFailure, getGetFailureQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function FailureDetail() {
  const { id } = useParams();
  const { data: failure, isLoading } = useGetFailure(id!, { query: { enabled: !!id, queryKey: getGetFailureQueryKey(id!) } });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading failure details...</div>;
  if (!failure) return <div className="p-8 text-destructive">Failure not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{failure.errorType}</h1>
            <Badge variant={failure.severity === 'critical' ? 'destructive' : 'outline'} className="uppercase">
              {failure.severity}
            </Badge>
            <Badge variant="outline" className="uppercase border-primary text-primary">
              {failure.status}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono text-sm">Pipeline: <Link href={`/pipelines/${failure.pipelineId}`} className="text-primary hover:underline">{failure.pipelineId}</Link></p>
        </div>
        {failure.bugId && (
          <Button variant="outline" className="border-border">
            View Linked Bug
          </Button>
        )}
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm uppercase text-muted-foreground">Root Cause</CardTitle></CardHeader>
        <CardContent>
          <div className="font-mono text-sm whitespace-pre-wrap">{failure.rootCause}</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm uppercase text-muted-foreground">Affected Files</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 space-y-1 font-mono text-sm text-muted-foreground">
              {failure.affectedFiles.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm uppercase text-muted-foreground">Suggested Fix</CardTitle></CardHeader>
          <CardContent>
            <div className="font-mono text-sm text-green-400 whitespace-pre-wrap">{failure.suggestedFix}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm uppercase text-muted-foreground">Raw Log</CardTitle></CardHeader>
        <CardContent>
          <pre className="font-mono text-xs text-muted-foreground bg-black p-4 rounded-md overflow-x-auto border border-border">
            {failure.rawLog}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
