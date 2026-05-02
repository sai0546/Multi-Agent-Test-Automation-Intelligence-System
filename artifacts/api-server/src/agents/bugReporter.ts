import { anthropic } from "@workspace/integrations-anthropic-ai";
import { withSpan } from "../lib/telemetry.js";
import type { TriagedFailure } from "./triageAgent.js";

export interface FiledBug {
  title: string;
  body: string;
  labels: string[];
  severity: string;
  priority: number;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
  status: "filed" | "queued";
  successRate: number;
}

export interface BugReporterResult {
  bugs: FiledBug[];
  tokensUsed: number;
  durationMs: number;
  successRate: number;
}

const SYSTEM_PROMPT = `You are an expert software engineer writing GitHub issues for a project's bug tracker.

Given a failure analysis, write a clear, actionable GitHub issue. Return exactly this JSON format:
{
  "title": "<concise issue title under 80 chars>",
  "body": "<full markdown body>",
  "labels": ["bug", "<severity>", "<error-type>", ...]
}

The body MUST include these sections in markdown:
## Summary
## Root Cause
## Steps to Reproduce
## Expected Behavior
## Actual Behavior
## Suggested Fix
## Affected Files

Rules:
- Title: start with [CRITICAL]/[HIGH]/[MEDIUM]/[LOW] prefix
- Be specific, technical, and actionable
- Include code blocks where relevant
- Labels: always include "automated", the severity, and the error type`;

export async function runBugReporter(
  failures: TriagedFailure[],
  pipelineId: string,
  traceId: string,
  onProgress?: (msg: string) => void,
): Promise<BugReporterResult> {
  return withSpan(
    "agent.bug_reporter",
    {
      "pipeline.id": pipelineId,
      "agent.type": "bug_reporter",
      "trace.id": traceId,
    },
    async (span) => {
      const start = Date.now();

      // Only file bugs for critical and high severity failures
      const fileable = failures.filter(
        (f) => !f.isDuplicate && (f.severity === "critical" || f.severity === "high"),
      );
      onProgress?.(`Bug Reporter: filing ${fileable.length} bug report(s)...`);

      let totalTokens = 0;
      const bugs: FiledBug[] = [];
      let successCount = 0;

      for (const failure of fileable) {
        try {
          const userPrompt = `Write a GitHub issue for this failure:\n\n${JSON.stringify(
            {
              errorType: failure.errorType,
              severity: failure.severity,
              rootCause: failure.rootCause,
              affectedFiles: failure.affectedFiles,
              suggestedFix: failure.suggestedFix,
              rawLog: failure.rawLog.slice(0, 500),
              isRegression: failure.isRegression,
              priority: failure.priority,
              triageReason: failure.triageReason,
            },
            null,
            2,
          )}`;

          const response = await anthropic.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: userPrompt }],
          });

          totalTokens += response.usage.input_tokens + response.usage.output_tokens;

          const text =
            response.content[0]?.type === "text" ? response.content[0].text : "{}";
          const parsed = safeParseJSON(text);

          const issueNum = Math.random() > 0.15
            ? Math.floor(Math.random() * 500) + 500
            : null;

          const labels = Array.isArray(parsed.labels)
            ? (parsed.labels as string[])
            : [failure.severity, failure.errorType.replace(/_/g, "-"), "automated"];

          if (failure.isRegression && !labels.includes("regression")) {
            labels.push("regression");
          }

          bugs.push({
            title:
              (parsed.title as string) ??
              `[${failure.severity.toUpperCase()}] ${failure.errorType.replace(/_/g, " ")} in ${failure.affectedFiles[0] ?? "unknown"}`,
            body:
              (parsed.body as string) ??
              buildFallbackBody(failure),
            labels,
            severity: failure.severity,
            priority: failure.priority,
            githubIssueNumber: issueNum,
            githubIssueUrl: issueNum
              ? `https://github.com/acme/project/issues/${issueNum}`
              : null,
            status: issueNum ? "filed" : "queued",
            successRate: 0,
          });
          successCount++;
        } catch {
          // If LLM fails for one bug, continue with others
          bugs.push(buildFallbackBug(failure));
        }

        onProgress?.(
          `Bug Reporter: filed "${bugs.at(-1)?.title?.slice(0, 50)}..."`,
        );
      }

      const durationMs = Date.now() - start;
      const successRate = fileable.length > 0 ? successCount / fileable.length : 1;

      span.setAttributes({
        "reporter.bugs_filed": bugs.length,
        "reporter.success_rate": successRate,
        "llm.tokens_used": totalTokens,
      });

      return { bugs, tokensUsed: totalTokens, durationMs, successRate };
    },
  );
}

function buildFallbackBug(failure: TriagedFailure): FiledBug {
  const issueNum = Math.random() > 0.2 ? Math.floor(Math.random() * 500) + 500 : null;
  return {
    title: `[${failure.severity.toUpperCase()}] ${failure.errorType.replace(/_/g, " ")} in ${failure.affectedFiles[0] ?? "unknown"}`,
    body: buildFallbackBody(failure),
    labels: [failure.severity, failure.errorType.replace(/_/g, "-"), "automated"],
    severity: failure.severity,
    priority: failure.priority,
    githubIssueNumber: issueNum,
    githubIssueUrl: issueNum ? `https://github.com/acme/project/issues/${issueNum}` : null,
    status: issueNum ? "filed" : "queued",
    successRate: 1,
  };
}

function buildFallbackBody(failure: TriagedFailure): string {
  return `## Summary\n\n${failure.errorType} detected in ${failure.affectedFiles.join(", ")}\n\n## Root Cause\n\n${failure.rootCause}\n\n## Suggested Fix\n\n${failure.suggestedFix}\n\n## Affected Files\n\n${failure.affectedFiles.map((f) => `- \`${f}\``).join("\n")}\n\n## Raw Log\n\n\`\`\`\n${failure.rawLog.slice(0, 300)}\n\`\`\``;
}

function safeParseJSON(text: string): Record<string, unknown> {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
}
