import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, index, integer, boolean, date, check, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  avatarColor: text("avatar_color").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  statusChangedAt: timestamp("status_changed_at").defaultNow().notNull(),
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

export const fines = pgTable(
  "fines",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    memberId: varchar("member_id").notNull().references(() => members.id),
    memberName: text("member_name").notNull(),
    incidentDate: date("incident_date", { mode: "string" }).notNull(),
    reason: text("reason").$type<"late" | "no-show">().notNull(),
    amount: integer("amount").notNull(),
    status: text("status").$type<"due" | "paid" | "removed">().default("due").notNull(),
    reportedByMemberId: varchar("reported_by_member_id").notNull().references(() => members.id),
    reporterName: text("reporter_name").notNull(),
    reportNote: text("report_note"),
    reportedAt: timestamp("reported_at", { withTimezone: true }).defaultNow().notNull(),
    paidByMemberId: varchar("paid_by_member_id").references(() => members.id),
    paidByName: text("paid_by_name"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    removedByMemberId: varchar("removed_by_member_id").references(() => members.id),
    removedByName: text("removed_by_name"),
    removalReason: text("removal_reason"),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    incidentDateIdx: index("fines_incident_date_idx").on(table.incidentDate),
    memberIncidentActiveIdx: uniqueIndex("fines_member_incident_active_uidx")
      .on(table.memberId, table.incidentDate)
      .where(sql`${table.status} <> 'removed'`),
    reasonCheck: check("fines_reason_check", sql`${table.reason} IN ('late', 'no-show')`),
    statusCheck: check("fines_status_check", sql`${table.status} IN ('due', 'paid', 'removed')`),
    amountCheck: check(
      "fines_amount_check",
      sql`(${table.reason} = 'late' AND ${table.amount} = 50) OR (${table.reason} = 'no-show' AND ${table.amount} = 100)`,
    ),
  }),
);

export const fineEvents = pgTable(
  "fine_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    fineId: varchar("fine_id").notNull().references(() => fines.id),
    incidentDate: date("incident_date", { mode: "string" }).notNull(),
    action: text("action").$type<"reported" | "paid" | "removed">().notNull(),
    actorMemberId: varchar("actor_member_id").notNull().references(() => members.id),
    actorName: text("actor_name").notNull(),
    subjectMemberId: varchar("subject_member_id").notNull().references(() => members.id),
    subjectMemberName: text("subject_member_name").notNull(),
    reason: text("reason").$type<"late" | "no-show">().notNull(),
    amount: integer("amount").notNull(),
    note: text("note"),
    deviceInfo: text("device_info").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    fineCreatedAtIdx: index("fine_events_fine_id_created_at_idx").on(table.fineId, table.createdAt),
    incidentCreatedAtIdx: index("fine_events_incident_date_created_at_idx").on(table.incidentDate, table.createdAt),
    actionCheck: check("fine_events_action_check", sql`${table.action} IN ('reported', 'paid', 'removed')`),
  }),
);

export const memberStatusEvents = pgTable(
  "member_status_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    memberId: varchar("member_id").notNull(),
    fromIsActive: boolean("from_is_active").notNull(),
    toIsActive: boolean("to_is_active").notNull(),
    changedBy: text("changed_by").notNull(),
    reason: text("reason"),
    source: text("source").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    memberCreatedAtIdx: index("member_status_events_member_id_created_at_idx").on(
      table.memberId,
      table.createdAt,
    ),
  }),
);

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
  isActive: true,
  statusChangedAt: true,
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

export const insertMemberStatusEventSchema = createInsertSchema(memberStatusEvents).omit({
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
export type Fine = typeof fines.$inferSelect;
export type FineEvent = typeof fineEvents.$inferSelect;
export type MemberStatusEvent = typeof memberStatusEvents.$inferSelect;
export type InsertMemberStatusEvent = z.infer<typeof insertMemberStatusEventSchema>;
export type AiChatTrace = typeof aiChatTraces.$inferSelect;

export const bookSlotSchema = z.object({
  memberId: z.string().min(1),
  memberName: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type BookSlotRequest = z.infer<typeof bookSlotSchema>;

export const fineReasonSchema = z.enum(["late", "no-show"]);
export const fineStatusSchema = z.enum(["due", "paid", "removed"]);
export const fineActionSchema = z.enum(["reported", "paid", "removed"]);
export const fineMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const fineDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const reportFineSchema = z.object({
  memberId: z.string().min(1),
  actorMemberId: z.string().min(1),
  reason: fineReasonSchema,
  note: z.string().trim().max(120).optional(),
});

export const recordFinePaymentSchema = z.object({
  actorMemberId: z.string().min(1),
});

export const removeFineSchema = z.object({
  actorMemberId: z.string().min(1),
  reason: z.string().trim().min(1).max(120),
});

export type FineReason = z.infer<typeof fineReasonSchema>;
export type FineStatus = z.infer<typeof fineStatusSchema>;
export type FineAction = z.infer<typeof fineActionSchema>;
export type ReportFineRequest = z.infer<typeof reportFineSchema>;
export type RecordFinePaymentRequest = z.infer<typeof recordFinePaymentSchema>;
export type RemoveFineRequest = z.infer<typeof removeFineSchema>;
