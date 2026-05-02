import { useListFailures } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, AlertTriangle, FileText } from "lucide-react";

export default function Failures() {
  const { data, isLoading } = useListFailures();

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading failures...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase text-primary mb-1">Failures</h1>
        <p className="text-muted-foreground">Triaged test failures from pipelines.</p>
      </div>

      <div className="grid gap-4">
        {data?.items.map((failure) => (
          <Link key={failure.id} href={`/failures/${failure.id}`}>
            <Card className="bg-card border-border hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="mt-1">
                  {failure.severity === 'critical' ? (
                    <ShieldAlert className="text-destructive w-5 h-5" />
                  ) : failure.severity === 'high' ? (
                    <AlertTriangle className="text-orange-500 w-5 h-5" />
                  ) : (
                    <FileText className="text-muted-foreground w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-foreground">{failure.errorType}</span>
                    <Badge variant="outline" className="border-border text-[10px] uppercase">
                      {failure.status}
                    </Badge>
                    {failure.isDuplicate && (
                      <Badge variant="secondary" className="text-[10px] uppercase bg-secondary text-secondary-foreground">Duplicate</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-1 mb-2 font-mono">
                    {failure.rootCause}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground font-mono">
                    <span>Priority: {failure.priority}</span>
                    <span>Files: {failure.affectedFiles.length}</span>
                    <span>{format(new Date(failure.createdAt), "MMM d, HH:mm")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
