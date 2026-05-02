import { pgTable, text, integer, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pipelinesTable = pgTable("pipelines", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("pending"),
  inputSource: text("input_source").notNull(),
  inputType: text("input_type").notNull(),
  model: text("model").notNull().default("claude-3-5-sonnet"),
  testsGenerated: integer("tests_generated").notNull().default(0),
  failuresAnalyzed: integer("failures_analyzed").notNull().default(0),
  bugsFiledCount: integer("bugs_filed_count").notNull().default(0),
  tokensUsed: integer("tokens_used").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  errorMessage: text("error_message"),
  dryRun: boolean("dry_run").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pipelineStagesTable = pgTable("pipeline_stages", {
  id: text("id").primaryKey(),
  pipelineId: text("pipeline_id").notNull().references(() => pipelinesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("pending"),
  durationMs: integer("duration_ms").notNull().default(0),
  tokensUsed: integer("tokens_used").notNull().default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const insertPipelineSchema = createInsertSchema(pipelinesTable).omit({ createdAt: true, updatedAt: true });
export const insertPipelineStageSchema = createInsertSchema(pipelineStagesTable);
export type InsertPipeline = z.infer<typeof insertPipelineSchema>;
export type Pipeline = typeof pipelinesTable.$inferSelect;
export type PipelineStage = typeof pipelineStagesTable.$inferSelect;
