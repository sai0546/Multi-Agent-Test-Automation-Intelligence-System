import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pipelinesTable } from "./pipelines";
import { failuresTable } from "./failures";

export const bugsTable = pgTable("bugs", {
  id: text("id").primaryKey(),
  failureId: text("failure_id").references(() => failuresTable.id, { onDelete: "set null" }),
  pipelineId: text("pipeline_id").notNull().references(() => pipelinesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  labels: text("labels").notNull().default("[]"),
  assignee: text("assignee"),
  status: text("status").notNull().default("queued"),
  githubIssueUrl: text("github_issue_url"),
  githubIssueNumber: integer("github_issue_number"),
  retryCount: integer("retry_count").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBugSchema = createInsertSchema(bugsTable).omit({ createdAt: true });
export type InsertBug = z.infer<typeof insertBugSchema>;
export type Bug = typeof bugsTable.$inferSelect;
