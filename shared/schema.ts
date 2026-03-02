import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, index, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  avatarColor: text("avatar_color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  memberName: text("member_name").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  memberName: text("member_name").notNull(),
  action: text("action").notNull(), // "booked" or "cancelled"
  date: text("date").notNull(), // YYYY-MM-DD format
  deviceInfo: text("device_info").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  memberName: text("member_name").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiChatTraces = pgTable(
  "ai_chat_traces",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    requestId: text("request_id").notNull().unique(),
    mode: text("mode").notNull(),
    scopeDecision: text("scope_decision"),
    intent: text("intent"),
    sqlText: text("sql_text"),
    validationOutcome: text("validation_outcome"),
    rowCount: integer("row_count"),
    execMs: integer("exec_ms"),
    fallbackReason: text("fallback_reason"),
    decisionSummary: text("decision_summary"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    requestIdIdx: index("ai_chat_traces_request_id_idx").on(table.requestId),
    createdAtIdx: index("ai_chat_traces_created_at_idx").on(table.createdAt),
  }),
);

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type AiChatTrace = typeof aiChatTraces.$inferSelect;

export const bookSlotSchema = z.object({
  memberId: z.string().min(1),
  memberName: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type BookSlotRequest = z.infer<typeof bookSlotSchema>;
