import { db, getCurrentSchema } from "./db";
import { members, bookings, activities, comments } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import type { 
  Member, 
  InsertMember, 
  Booking, 
  InsertBooking, 
  Activity, 
  InsertActivity,
  Comment,
  InsertComment 
} from "@shared/schema";

export interface IStorage {
  // Members
  getMembers(): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  
  // Bookings
  getBookings(): Promise<Booking[]>;
  getBookingsByDate(date: string): Promise<Booking[]>;
  getBookingsByMember(memberId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  deleteBooking(memberId: string, date: string): Promise<boolean>;
  
  // Activities
  getActivities(): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Comments
  getComments(): Promise<Comment[]>;
  getCommentsByDate(date: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeData();
  }

  private async initializeData() {
    // Initialize with members and environment-appropriate data
    try {
      const existingMembers = await this.getMembers();
      if (existingMembers.length === 0) {
        const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT;
        const environment = isProduction ? 'production' : 'development';
        console.log(`🚀 Initializing database with ${environment} data (NODE_ENV: ${process.env.NODE_ENV}, REPLIT_DEPLOYMENT: ${process.env.REPLIT_DEPLOYMENT || 'false'})...`);
        
        // Create members with specific IDs for consistent sample data
        const defaultMembers: InsertMember[] = [
          { name: "Ashish", initials: "A", avatarColor: "green" },
          { name: "Gagan", initials: "G", avatarColor: "blue" },
          { name: "He-man", initials: "H", avatarColor: "purple" },
          { name: "Kaushal", initials: "K", avatarColor: "yellow" },
          { name: "Main hoon na", initials: "MH", avatarColor: "pink" },
          { name: "Aswini", initials: "AS", avatarColor: "indigo" },
          { name: "Rahul", initials: "R", avatarColor: "orange" },
          { name: "RK", initials: "RK", avatarColor: "red" },
          { name: "Anjali", initials: "AN", avatarColor: "teal" },
          { name: "Kumar", initials: "KU", avatarColor: "cyan" },
        ];
        
        // Insert members and get their IDs
        const createdMembers: Member[] = [];
        for (const member of defaultMembers) {
          const [newMember] = await db.insert(members).values(member).returning();
          createdMembers.push(newMember);
        }

        // Only add sample data in development environment
        if (!isProduction) {
          console.log('Adding sample bookings and activities for development...');

          // Add sample bookings from recent dates
        const sampleBookings: InsertBooking[] = [
          { memberId: createdMembers[0].id, memberName: "Ashish", date: "2025-08-20" },
          { memberId: createdMembers[1].id, memberName: "Gagan", date: "2025-08-20" },
          { memberId: createdMembers[2].id, memberName: "He-man", date: "2025-08-20" },
          { memberId: createdMembers[5].id, memberName: "Aswini", date: "2025-08-20" },
          { memberId: createdMembers[7].id, memberName: "RK", date: "2025-08-20" },
          { memberId: createdMembers[8].id, memberName: "Anjali", date: "2025-08-20" },
          { memberId: createdMembers[3].id, memberName: "Kaushal", date: "2025-08-22" },
          { memberId: createdMembers[2].id, memberName: "He-man", date: "2025-08-25" },
          { memberId: createdMembers[3].id, memberName: "Kaushal", date: "2025-08-25" },
          { memberId: createdMembers[1].id, memberName: "Gagan", date: "2025-08-25" },
          { memberId: createdMembers[2].id, memberName: "He-man", date: "2025-08-27" },
          { memberId: createdMembers[2].id, memberName: "He-man", date: "2025-08-28" },
          { memberId: createdMembers[2].id, memberName: "He-man", date: "2025-08-29" },
        ];

        for (const booking of sampleBookings) {
          await db.insert(bookings).values(booking);
        }

        // Add sample activities
        const sampleActivities: InsertActivity[] = [
          { memberId: createdMembers[0].id, memberName: "Ashish", action: "booked a slot for", date: "2025-08-20", deviceInfo: "Mac Desktop (macOS 10.15.7) - Chrome" },
          { memberId: createdMembers[1].id, memberName: "Gagan", action: "booked a slot for", date: "2025-08-20", deviceInfo: "Mac Desktop (macOS 10.15.7) - Chrome" },
          { memberId: createdMembers[2].id, memberName: "He-man", action: "booked a slot for", date: "2025-08-20", deviceInfo: "Mac Desktop (macOS 10.15.7) - Chrome" },
          { memberId: createdMembers[5].id, memberName: "Aswini", action: "booked a slot for", date: "2025-08-20", deviceInfo: "Mac Desktop (macOS 10.15.7) - Chrome" },
          { memberId: createdMembers[7].id, memberName: "RK", action: "booked a slot for", date: "2025-08-20", deviceInfo: "Mac Desktop (macOS 10.15.7) - Chrome" },
          { memberId: createdMembers[8].id, memberName: "Anjali", action: "booked a slot for", date: "2025-08-20", deviceInfo: "Mac Desktop (macOS 10.15.7) - Chrome" },
          { memberId: createdMembers[3].id, memberName: "Kaushal", action: "booked a slot for", date: "2025-08-22", deviceInfo: "Mac Desktop (macOS 10.15.7) - Chrome" },
          { memberId: createdMembers[2].id, memberName: "He-man", action: "booked a slot for", date: "2025-08-25", deviceInfo: "Mac Desktop (macOS 10.15.7) - Chrome" },
          { memberId: createdMembers[3].id, memberName: "Kaushal", action: "booked a slot for", date: "2025-08-25", deviceInfo: "Mac Desktop (macOS 10.15.7) - Chrome" },
          { memberId: createdMembers[1].id, memberName: "Gagan", action: "booked a slot for", date: "2025-08-25", deviceInfo: "iPhone (iOS 18.6.1) - Safari" },
          { memberId: createdMembers[2].id, memberName: "He-man", action: "booked a slot for", date: "2025-08-27", deviceInfo: "Mac Desktop (macOS 10.15.7) - Chrome" },
          { memberId: createdMembers[2].id, memberName: "He-man", action: "booked a slot for", date: "2025-08-28", deviceInfo: "Android 10 K (Android 10) - Edge" },
          { memberId: createdMembers[2].id, memberName: "He-man", action: "booked a slot for", date: "2025-08-29", deviceInfo: "Mac Desktop (macOS 10.15.7) - Chrome" },
        ];

        for (const activity of sampleActivities) {
          await db.insert(activities).values(activity);
        }

        // Add some sample comments
        const sampleComments: InsertComment[] = [
          { memberId: createdMembers[0].id, memberName: "Ashish", date: "2025-08-20", comment: "Looking forward to playing today!" },
          { memberId: createdMembers[1].id, memberName: "Gagan", date: "2025-08-20", comment: "I'll bring the shuttlecocks" },
          { memberId: createdMembers[2].id, memberName: "He-man", date: "2025-08-25", comment: "Can we start 15 minutes early?" },
          { memberId: createdMembers[3].id, memberName: "Kaushal", date: "2025-08-25", comment: "Sure, sounds good!" },
        ];

        for (const comment of sampleComments) {
          await db.insert(comments).values(comment);
        }

          console.log('Development sample data initialized successfully!');
        } else {
          console.log('Production database initialized with members only (no sample data).');
        }
      }
    } catch (error) {
      console.log('Database not ready yet, will initialize later:', error);
    }
  }

  async getMembers(): Promise<Member[]> {
    try {
      const result = await db.execute(
        sql.raw(`SELECT id, name, initials, avatar_color, created_at FROM ${getCurrentSchema()}.members ORDER BY created_at`)
      );
      const members = result.rows.map(row => ({
        id: row.id as string,
        name: row.name as string,
        initials: row.initials as string,
        avatarColor: row.avatar_color as string,
        createdAt: new Date(row.created_at as string)
      }));
      console.log('Members result:', { ok: true, value: members });
      return members;
    } catch (error) {
      console.error('Error getting members:', error);
      return [];
    }
  }

  async createMember(member: InsertMember): Promise<Member> {
    try {
      const result = await db.execute(
        sql.raw(`INSERT INTO ${getCurrentSchema()}.members (id, name, initials, avatar_color, created_at) 
                 VALUES ('${member.id}', '${member.name}', '${member.initials}', '${member.avatarColor}', NOW()) 
                 RETURNING id, name, initials, avatar_color, created_at`)
      );
      const row = result.rows[0];
      return {
        id: row.id as string,
        name: row.name as string,
        initials: row.initials as string,
        avatarColor: row.avatar_color as string,
        createdAt: new Date(row.created_at as string)
      };
    } catch (error) {
      console.error('Error creating member:', error);
      throw error;
    }
  }

  async getBookings(): Promise<Booking[]> {
    try {
      const result = await db.execute(
        sql.raw(`SELECT id, member_id, member_name, date, created_at FROM ${getCurrentSchema()}.bookings ORDER BY created_at DESC`)
      );
      const bookings = result.rows.map(row => ({
        id: row.id as string,
        memberId: row.member_id as string,
        memberName: row.member_name as string,
        date: row.date as string,
        createdAt: new Date(row.created_at as string)
      }));
      return bookings;
    } catch (error) {
      console.error('Error getting bookings:', error);
      return [];
    }
  }

  async getBookingsByDate(date: string): Promise<Booking[]> {
    try {
      const result = await db.execute(
        sql.raw(`SELECT id, member_id, member_name, date, created_at FROM ${getCurrentSchema()}.bookings WHERE date = '${date}' ORDER BY created_at DESC`)
      );
      return result.rows.map(row => ({
        id: row.id as string,
        memberId: row.member_id as string,
        memberName: row.member_name as string,
        date: row.date as string,
        createdAt: new Date(row.created_at as string)
      }));
    } catch (error) {
      console.error('Error getting bookings by date:', error);
      return [];
    }
  }

  async getBookingsByMember(memberId: string): Promise<Booking[]> {
    try {
      const result = await db.execute(
        sql.raw(`SELECT id, member_id, member_name, date, created_at FROM ${getCurrentSchema()}.bookings WHERE member_id = '${memberId}' ORDER BY created_at DESC`)
      );
      return result.rows.map(row => ({
        id: row.id as string,
        memberId: row.member_id as string,
        memberName: row.member_name as string,
        date: row.date as string,
        createdAt: new Date(row.created_at as string)
      }));
    } catch (error) {
      console.error('Error getting bookings by member:', error);
      return [];
    }
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    try {
      const result = await db.execute(
        sql.raw(`INSERT INTO ${getCurrentSchema()}.bookings (id, member_id, member_name, date, created_at) 
                 VALUES ('${booking.id}', '${booking.memberId}', '${booking.memberName}', '${booking.date}', NOW()) 
                 RETURNING id, member_id, member_name, date, created_at`)
      );
      const row = result.rows[0];
      return {
        id: row.id as string,
        memberId: row.member_id as string,
        memberName: row.member_name as string,
        date: row.date as string,
        createdAt: new Date(row.created_at as string)
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  async deleteBooking(memberId: string, date: string): Promise<boolean> {
    try {
      await db.execute(
        sql.raw(`DELETE FROM ${getCurrentSchema()}.bookings WHERE member_id = '${memberId}' AND date = '${date}'`)
      );
      return true;
    } catch (error) {
      console.error('Error deleting booking:', error);
      return false;
    }
  }

  async getActivities(): Promise<Activity[]> {
    try {
      const result = await db.execute(
        sql.raw(`SELECT id, member_id, member_name, action, date, device_info, created_at FROM ${getCurrentSchema()}.activities ORDER BY created_at DESC`)
      );
      const activities = result.rows.map(row => ({
        id: row.id as string,
        memberId: row.member_id as string,
        memberName: row.member_name as string,
        action: row.action as string,
        date: row.date as string,
        deviceInfo: row.device_info as string,
        createdAt: new Date(row.created_at as string)
      }));
      console.log('Activities result:', { ok: true, value: activities });
      return activities;
    } catch (error) {
      console.error('Error getting activities:', error);
      return [];
    }
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    try {
      const result = await db.execute(
        sql.raw(`INSERT INTO ${getCurrentSchema()}.activities (id, member_id, member_name, action, date, device_info, created_at) 
                 VALUES ('${activity.id}', '${activity.memberId}', '${activity.memberName}', '${activity.action}', '${activity.date}', '${activity.deviceInfo}', NOW()) 
                 RETURNING id, member_id, member_name, action, date, device_info, created_at`)
      );
      const row = result.rows[0];
      return {
        id: row.id as string,
        memberId: row.member_id as string,
        memberName: row.member_name as string,
        action: row.action as string,
        date: row.date as string,
        deviceInfo: row.device_info as string,
        createdAt: new Date(row.created_at as string)
      };
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  }

  async getComments(): Promise<Comment[]> {
    try {
      const result = await db.execute(
        sql.raw(`SELECT id, date, comment, created_at FROM ${getCurrentSchema()}.comments ORDER BY created_at DESC`)
      );
      return result.rows.map(row => ({
        id: row.id as string,
        date: row.date as string,
        comment: row.comment as string,
        createdAt: new Date(row.created_at as string)
      }));
    } catch (error) {
      console.error('Error getting comments:', error);
      return [];
    }
  }

  async getCommentsByDate(date: string): Promise<Comment[]> {
    try {
      const result = await db.execute(
        sql.raw(`SELECT id, date, comment, created_at FROM ${getCurrentSchema()}.comments WHERE date = '${date}' ORDER BY created_at DESC`)
      );
      const comments = result.rows.map(row => ({
        id: row.id as string,
        date: row.date as string,
        comment: row.comment as string,
        createdAt: new Date(row.created_at as string)
      }));
      return comments;
    } catch (error) {
      console.error('Error getting comments by date:', error);
      return [];
    }
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    try {
      const result = await db.execute(
        sql.raw(`INSERT INTO ${getCurrentSchema()}.comments (id, date, comment, created_at) 
                 VALUES ('${comment.id}', '${comment.date}', '${comment.comment}', NOW()) 
                 RETURNING id, date, comment, created_at`)
      );
      const row = result.rows[0];
      return {
        id: row.id as string,
        date: row.date as string,
        comment: row.comment as string,
        createdAt: new Date(row.created_at as string)
      };
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();