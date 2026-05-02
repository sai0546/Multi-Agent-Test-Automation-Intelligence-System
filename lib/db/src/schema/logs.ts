import { pgTable, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const logEntriesTable = pgTable("log_entries", {
  id: text("id").primaryKey(),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  agentId: text("agent_id"),
  agentType: text("agent_type"),
  pipelineId: text("pipeline_id"),
  traceId: text("trace_id"),
  latencyMs: integer("latency_ms"),
  tokensUsed: integer("tokens_used"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLogEntrySchema = createInsertSchema(logEntriesTable).omit({ createdAt: true });
export type InsertLogEntry = z.infer<typeof insertLogEntrySchema>;
export type LogEntry = typeof logEntriesTable.$inferSelect;
