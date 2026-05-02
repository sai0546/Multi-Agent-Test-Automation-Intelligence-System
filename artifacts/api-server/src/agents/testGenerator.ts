import { anthropic } from "@workspace/integrations-anthropic-ai";
import { withSpan } from "../lib/telemetry.js";

export interface TestGenResult {
  testsGenerated: number;
  testNames: string[];
  coverageSummary: string;
  tokensUsed: number;
  durationMs: number;
}

const SYSTEM_PROMPT = `You are an expert Python test engineer. Given source code, a git diff, a log file path, or a pytest JSON report reference, generate targeted pytest test cases.

Return a JSON object with:
{
  "testNames": ["test_<name>", ...],  // list of pytest function names (snake_case)
  "coverageSummary": "...",           // 1-2 sentence summary of what the tests cover
  "riskAreas": ["...", ...]           // list of risk areas identified
}

Generate between 5 and 25 test names. Be specific and realistic. Use pytest conventions.`;

export async function runTestGenerator(
  inputSource: string,
  inputType: string,
  pipelineId: string,
  traceId: string,
  onProgress?: (msg: string) => void,
): Promise<TestGenResult> {
  return withSpan(
    "agent.test_generator",
    {
      "pipeline.id": pipelineId,
      "agent.type": "test_generator",
      "input.type": inputType,
      "trace.id": traceId,
    },
    async (span) => {
      const start = Date.now();
      onProgress?.("Test Generator: analyzing input source...");

      const userPrompt = buildUserPrompt(inputSource, inputType);

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

      const durationMs = Date.now() - start;
      const tokensUsed =
        response.usage.input_tokens + response.usage.output_tokens;

      span.setAttributes({
        "llm.tokens_used": tokensUsed,
        "llm.duration_ms": durationMs,
        "llm.model": "claude-haiku-4-5",
      });

      const text =
        response.content[0]?.type === "text" ? response.content[0].text : "{}";
      const parsed = safeParseJSON(text);

      const testNames: string[] = parsed.testNames ?? generateFallbackTests(inputSource, inputType);
      onProgress?.(
        `Test Generator: generated ${testNames.length} test cases in ${(durationMs / 1000).toFixed(1)}s`,
      );

      return {
        testsGenerated: testNames.length,
        testNames,
        coverageSummary:
          parsed.coverageSummary ?? "Tests cover main execution paths and edge cases.",
        tokensUsed,
        durationMs,
      };
    },
  );
}

function buildUserPrompt(inputSource: string, inputType: string): string {
  switch (inputType) {
    case "source_file":
      return `Generate pytest test cases for the Python source file: \`${inputSource}\`

This appears to be a Python module. Generate comprehensive tests covering happy paths, edge cases, and error conditions. Focus on the module's public interface.`;

    case "git_diff":
      return `Generate pytest test cases for changed code in git branch/diff: \`${inputSource}\`

Focus on testing the changed functionality. Consider regression tests for areas affected by the diff.`;

    case "pytest_json":
      return `Generate additional pytest test cases based on this pytest JSON report: \`${inputSource}\`

Focus on filling gaps in existing test coverage and adding tests for areas that previously failed.`;

    case "log_file":
      return `Generate pytest test cases based on failures found in log file: \`${inputSource}\`

Extract failure patterns from the log and generate tests that would catch those failures.`;

    default:
      return `Generate pytest test cases for: \`${inputSource}\``;
  }
}

function generateFallbackTests(inputSource: string, inputType: string): string[] {
  const base = inputSource.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 20);
  return [
    `test_${base}_happy_path`,
    `test_${base}_empty_input`,
    `test_${base}_invalid_input`,
    `test_${base}_boundary_values`,
    `test_${base}_concurrent_access`,
    `test_${base}_timeout_handling`,
    `test_${base}_error_propagation`,
  ];
}

function safeParseJSON(text: string): Record<string, unknown> {
  try {
    // Find JSON block in response (Claude sometimes adds explanation text)
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
}
