import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pipelinesTable } from "./pipelines";

export const failuresTable = pgTable("failures", {
  id: text("id").primaryKey(),
  pipelineId: text("pipeline_id").notNull().references(() => pipelinesTable.id, { onDelete: "cascade" }),
  errorType: text("error_type").notNull().default("unknown"),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  rootCause: text("root_cause").notNull(),
  affectedFiles: text("affected_files").notNull().default("[]"),
  suggestedFix: text("suggested_fix").notNull().default(""),
  priority: integer("priority").notNull().default(3),
  isDuplicate: boolean("is_duplicate").notNull().default(false),
  duplicateOfId: text("duplicate_of_id"),
  isRegression: boolean("is_regression").notNull().default(false),
  rawLog: text("raw_log").notNull().default(""),
  bugId: text("bug_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFailureSchema = createInsertSchema(failuresTable).omit({ createdAt: true });
export type InsertFailure = z.infer<typeof insertFailureSchema>;
export type Failure = typeof failuresTable.$inferSelect;
