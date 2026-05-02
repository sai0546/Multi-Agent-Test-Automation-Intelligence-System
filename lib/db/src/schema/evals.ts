import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const evalRunsTable = pgTable("eval_runs", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("running"),
  totalCases: integer("total_cases").notNull().default(50),
  passedCases: integer("passed_cases").notNull().default(0),
  failedCases: integer("failed_cases").notNull().default(0),
  testGenCoveragePercent: real("test_gen_coverage_percent").notNull().default(0),
  logAnalyzerPrecision: real("log_analyzer_precision").notNull().default(0),
  logAnalyzerRecall: real("log_analyzer_recall").notNull().default(0),
  triageF1Score: real("triage_f1_score").notNull().default(0),
  bugFilingSuccessRate: real("bug_filing_success_rate").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertEvalRunSchema = createInsertSchema(evalRunsTable).omit({ createdAt: true });
export type InsertEvalRun = z.infer<typeof insertEvalRunSchema>;
export type EvalRun = typeof evalRunsTable.$inferSelect;
