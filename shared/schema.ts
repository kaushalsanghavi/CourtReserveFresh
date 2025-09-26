import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { isSundayDate, isValidTimeSlot, isFutureDate } from "./sunday-booking-utils";

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
  isSundayBooking: boolean("is_sunday_booking").default(false),
  timeSlot: text("time_slot"), // e.g., "8:00 AM - 9:00 AM" (null for weekday bookings)
  timeSetBy: varchar("time_set_by"), // member_id who set the time (Sunday only)
  timeSetAt: timestamp("time_set_at"), // when time was set (Sunday only)
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

// Sunday booking specific types
export interface SundayBookingGroup {
  date: string;
  timeSlot: string | null;
  timeSetBy: string | null;
  timeSetAt: Date | null;
  participants: Booking[];
  availableSpots: number;
}

export interface SundayBookingParticipant {
  memberId: string;
  memberName: string;
  joinedAt: string;
}

export interface SundayBookingResponse {
  date: string;
  timeSlot: string | null;
  timeSetBy: string | null;
  participants: SundayBookingParticipant[];
  availableSpots: number;
}

// Extended booking schema with Sunday-specific validation
export const bookSlotSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  memberName: z.string().min(1, "Member name is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  isSundayBooking: z.boolean().optional(),
  timeSlot: z.string().optional(),
}).refine((data) => {
  // Auto-detect if this is a Sunday booking
  const isSunday = isSundayDate(data.date);
  
  // If it's a Sunday booking and timeSlot is provided, validate the format
  if (isSunday && data.timeSlot && !isValidTimeSlot(data.timeSlot)) {
    return false;
  }
  
  // Ensure the date is in the future
  if (!isFutureDate(data.date)) {
    return false;
  }
  
  return true;
}, {
  message: "Invalid booking data: check date format, time slot format, and ensure date is in the future",
});

// Schema for updating time slots (Sunday bookings only)
export const timeUpdateSchema = z.object({
  timeSlot: z.string().min(1, "Time slot is required").refine(isValidTimeSlot, {
    message: "Time slot must be in format 'HH:MM AM/PM - HH:MM AM/PM'",
  }),
  memberId: z.string().min(1, "Member ID is required"),
});

// Schema for Sunday booking creation with time slot setting
export const sundayBookingWithTimeSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  memberName: z.string().min(1, "Member name is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  timeSlot: z.string().min(1, "Time slot is required for Sunday bookings").refine(isValidTimeSlot, {
    message: "Time slot must be in format 'HH:MM AM/PM - HH:MM AM/PM'",
  }),
}).refine((data) => {
  // Ensure this is actually a Sunday
  if (!isSundayDate(data.date)) {
    return false;
  }
  
  // Ensure the date is in the future
  if (!isFutureDate(data.date)) {
    return false;
  }
  
  return true;
}, {
  message: "Date must be a future Sunday",
});

// Enhanced booking validation that handles both weekday and Sunday bookings
export const validateBookingRequest = (data: any) => {
  const isSunday = isSundayDate(data.date);
  
  // Set the isSundayBooking flag based on the date
  const bookingData = {
    ...data,
    isSundayBooking: isSunday,
  };
  
  // Use the appropriate schema based on booking type
  if (isSunday) {
    // For Sunday bookings, timeSlot might be optional if already set for that date
    return bookSlotSchema.parse(bookingData);
  } else {
    // For weekday bookings, ensure no Sunday-specific fields are set
    const weekdayData = {
      ...bookingData,
      timeSlot: undefined, // Remove timeSlot for weekday bookings
      isSundayBooking: false,
    };
    return bookSlotSchema.parse(weekdayData);
  }
};

export type BookSlotRequest = z.infer<typeof bookSlotSchema>;
export type TimeUpdateRequest = z.infer<typeof timeUpdateSchema>;
export type SundayBookingWithTimeRequest = z.infer<typeof sundayBookingWithTimeSchema>;
