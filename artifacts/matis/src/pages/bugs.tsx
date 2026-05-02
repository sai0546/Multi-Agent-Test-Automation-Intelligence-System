import { useListBugs } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug as BugIcon, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Bugs() {
  const { data, isLoading } = useListBugs();

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading bugs...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase text-primary mb-1">Filed Bugs</h1>
        <p className="text-muted-foreground">Issues automatically filed to GitHub.</p>
      </div>

      <div className="grid gap-4">
        {data?.items.map((bug) => (
          <Card key={bug.id} className="bg-card border-border">
            <CardContent className="p-4 flex items-start gap-4">
              <div className="mt-1">
                <BugIcon className="text-primary w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-foreground">{bug.title}</span>
                  <Badge variant="outline" className="border-border text-[10px] uppercase">
                    {bug.status}
                  </Badge>
                  {bug.labels.map(l => (
                    <Badge key={l} variant="secondary" className="text-[10px] uppercase bg-secondary text-secondary-foreground">{l}</Badge>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground line-clamp-1 mb-2 font-mono">
                  {bug.body.split('\n')[0]}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                  {bug.assignee && <span>Assignee: {bug.assignee}</span>}
                  <span>{format(new Date(bug.createdAt), "MMM d, HH:mm")}</span>
                </div>
              </div>
              {bug.githubIssueUrl && (
                <Button variant="outline" size="sm" className="gap-2 border-border" asChild>
                  <a href={bug.githubIssueUrl} target="_blank" rel="noreferrer">
                    <Github className="w-4 h-4" /> Issue #{bug.githubIssueNumber}
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
