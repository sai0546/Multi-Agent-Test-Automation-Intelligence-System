import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentsTable = pgTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("idle"),
  model: text("model").notNull(),
  currentTaskId: text("current_task_id"),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  tasksFailed: integer("tasks_failed").notNull().default(0),
  avgLatencyMs: integer("avg_latency_ms").notNull().default(0),
  totalTokensUsed: integer("total_tokens_used").notNull().default(0),
  circuitBreakerState: text("circuit_breaker_state").notNull().default("closed"),
  circuitBreakerTrips: integer("circuit_breaker_trips").notNull().default(0),
  p95LatencyMs: integer("p95_latency_ms").notNull().default(0),
  lastHeartbeat: timestamp("last_heartbeat").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agentsTable).omit({ createdAt: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentsTable.$inferSelect;
