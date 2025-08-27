import { db } from "./db";
import { members, bookings, activities, comments } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
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
    // Initialize with default members if they don't exist
    try {
      const existingMembers = await this.getMembers();
      if (existingMembers.length === 0) {
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
        
        for (const member of defaultMembers) {
          await db.insert(members).values(member);
        }
      }
    } catch (error) {
      console.log('Database not ready yet, will initialize later:', error);
    }
  }

  async getMembers(): Promise<Member[]> {
    try {
      const result = await db.select().from(members);
      console.log('Members result:', { ok: true, value: result });
      return result;
    } catch (error) {
      console.error('Error getting members:', error);
      return [];
    }
  }

  async createMember(member: InsertMember): Promise<Member> {
    const [newMember] = await db.insert(members).values(member).returning();
    return newMember;
  }

  async getBookings(): Promise<Booking[]> {
    try {
      return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    } catch (error) {
      console.error('Error getting bookings:', error);
      return [];
    }
  }

  async getBookingsByDate(date: string): Promise<Booking[]> {
    try {
      return await db.select().from(bookings).where(eq(bookings.date, date));
    } catch (error) {
      console.error('Error getting bookings by date:', error);
      return [];
    }
  }

  async getBookingsByMember(memberId: string): Promise<Booking[]> {
    try {
      return await db.select().from(bookings).where(eq(bookings.memberId, memberId));
    } catch (error) {
      console.error('Error getting bookings by member:', error);
      return [];
    }
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async deleteBooking(memberId: string, date: string): Promise<boolean> {
    try {
      const result = await db.delete(bookings)
        .where(and(eq(bookings.memberId, memberId), eq(bookings.date, date)));
      return true;
    } catch (error) {
      console.error('Error deleting booking:', error);
      return false;
    }
  }

  async getActivities(): Promise<Activity[]> {
    try {
      const result = await db.select().from(activities).orderBy(desc(activities.createdAt));
      console.log('Activities result:', { ok: true, value: result });
      return result;
    } catch (error) {
      console.error('Error getting activities:', error);
      return [];
    }
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async getComments(): Promise<Comment[]> {
    try {
      return await db.select().from(comments).orderBy(desc(comments.createdAt));
    } catch (error) {
      console.error('Error getting comments:', error);
      return [];
    }
  }

  async getCommentsByDate(date: string): Promise<Comment[]> {
    try {
      return await db.select().from(comments).where(eq(comments.date, date));
    } catch (error) {
      console.error('Error getting comments by date:', error);
      return [];
    }
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }
}

export const storage = new DatabaseStorage();