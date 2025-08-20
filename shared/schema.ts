import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Database-like tables for type consistency
export const bookings = {
  id: z.string(),
  date: z.string(), // YYYY-MM-DD format
  memberName: z.string(),
  deviceInfo: z.string(), // Detailed device information
  createdAt: z.string(), // ISO timestamp
};

export const activities = {
  id: z.string(),
  type: z.enum(['book', 'cancel']),
  memberName: z.string(),
  date: z.string(), // YYYY-MM-DD format
  deviceInfo: z.string(), // Detailed device information
  createdAt: z.string(), // ISO timestamp
};

// Types for the application
export type Booking = {
  id: string;
  date: string;
  memberName: string;
  deviceInfo: string;
  createdAt: string;
};

export type Activity = {
  id: string;
  type: 'book' | 'cancel';
  memberName: string;
  date: string;
  deviceInfo: string;
  createdAt: string;
};

export type MonthlyStats = {
  member: string;
  totalBookings: number;
  participationRate: number;
  status: 'Low' | 'Medium' | 'High';
};

// Insert schemas for validation
export const insertBookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  memberName: z.string().min(1, 'Member name is required'),
  deviceInfo: z.string().min(1, 'Device info is required'),
});

export const insertActivitySchema = z.object({
  type: z.enum(['book', 'cancel']),
  memberName: z.string().min(1, 'Member name is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  deviceInfo: z.string().min(1, 'Device info is required'),
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Predefined members
export const MEMBERS = [
  'Ashish',
  'Gagan', 
  'He-man',
  'Kaushal',
  'Main hoon na',
  'Aswini',
  'Rahul',
  'RK',
  'Anjali',
  'Kumar'
] as const;

export type MemberName = typeof MEMBERS[number];

// Business constants
export const MAX_SLOTS_PER_DAY = 6;
export const BOOKING_WINDOW_WEEKS = 2;
export const SLOT_TIME = '8:30 AM - 9:45 AM';