import { useListPipelines, useCreatePipeline, getListPipelinesQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Play, CheckCircle, Clock, AlertTriangle, AlertCircle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  inputSource: z.string().min(1, "Input source is required"),
  inputType: z.enum(["source_file", "pytest_json", "git_diff", "log_file"]),
  model: z.enum(["claude-3-5-sonnet", "gpt-4o-mini", "claude-3-5-haiku", "gemini-2-flash"]).optional(),
});

const INPUT_TYPE_EXAMPLES: Record<string, string> = {
  source_file: "e.g. src/auth/session.py",
  pytest_json: "e.g. ci/pytest-report.json",
  git_diff:    "e.g. feature/payments-v2",
  log_file:    "e.g. logs/test-run-2024.log",
};

export default function Pipelines() {
  const { data, isLoading } = useListPipelines();
  const createPipeline = useCreatePipeline();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inputSource: "",
      inputType: "source_file",
      model: "claude-3-5-sonnet",
    },
  });

  const selectedType = form.watch("inputType");

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createPipeline.mutate({ data: values }, {
      onSuccess: (pipeline) => {
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: getListPipelinesQueryKey() });
        form.reset();
        navigate(`/pipelines/${pipeline.id}`);
      },
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="text-green-500 w-4 h-4" />;
      case "running":   return <Activity className="text-primary w-4 h-4 animate-pulse" />;
      case "failed":    return <AlertCircle className="text-destructive w-4 h-4" />;
      case "partial":   return <AlertTriangle className="text-yellow-500 w-4 h-4" />;
      default:          return <Clock className="text-muted-foreground w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold uppercase text-primary mb-1">Pipelines</h1>
          <p className="text-muted-foreground">Automated testing and triage runs powered by Claude AI agents.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Play className="w-4 h-4" /> Run Pipeline
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Run New Pipeline
              </DialogTitle>
            </DialogHeader>
            <div className="text-xs text-muted-foreground mb-4 p-3 bg-primary/5 border border-primary/20 rounded-md font-mono">
              Real Claude AI agents will analyze your input, triage failures, and file GitHub issues — streamed live.
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="inputType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Input Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select input type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="source_file">Source File — generate tests from code</SelectItem>
                          <SelectItem value="pytest_json">Pytest JSON — analyze test report</SelectItem>
                          <SelectItem value="git_diff">Git Diff — analyze changed code</SelectItem>
                          <SelectItem value="log_file">Log File — extract failures from logs</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="inputSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Input Source</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={INPUT_TYPE_EXAMPLES[selectedType] ?? "Enter path or reference"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                          <SelectItem value="claude-3-5-haiku">Claude 3.5 Haiku</SelectItem>
                          <SelectItem value="gemini-2-flash">Gemini 2 Flash</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full gap-2" disabled={createPipeline.isPending}>
                  {createPipeline.isPending ? (
                    <><Activity className="w-4 h-4 animate-spin" /> Starting agents…</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Start Pipeline</>
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading pipelines...</div>
      ) : (
        <div className="grid gap-3">
          {data?.items.map((pipeline) => (
            <Link key={pipeline.id} href={`/pipelines/${pipeline.id}`}>
              <Card className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(pipeline.status)}
                    <div>
                      <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {pipeline.inputSource.length > 55
                          ? pipeline.inputSource.substring(0, 52) + "…"
                          : pipeline.inputSource}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono flex items-center gap-2 mt-1">
                        <span>{pipeline.id.substring(0, 8)}</span>
                        <span>&bull;</span>
                        <Badge variant="outline" className="text-[10px] uppercase border-border px-1">
                          {pipeline.model}
                        </Badge>
                        <span>&bull;</span>
                        <span>{format(new Date(pipeline.createdAt), "MMM d, HH:mm")}</span>
                        {pipeline.dryRun && (
                          <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            DRY RUN
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6 text-sm">
                    {[
                      { label: "Failures", value: pipeline.failuresAnalyzed },
                      { label: "Bugs", value: pipeline.bugsFiledCount },
                      { label: "Cost", value: `$${pipeline.costUsd.toFixed(4)}`, className: "text-green-400" },
                      { label: "Duration", value: `${(pipeline.durationMs / 1000).toFixed(1)}s` },
                    ].map(({ label, value, className }) => (
                      <div key={label} className="flex flex-col items-end">
                        <span className="text-muted-foreground text-[10px] uppercase">{label}</span>
                        <span className={`font-bold font-mono ${className ?? ""}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
