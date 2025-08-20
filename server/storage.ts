
import { type Member, type InsertMember, type Booking, type InsertBooking, type Activity, type InsertActivity, type Comment, type InsertComment } from "@shared/schema";
import { randomUUID } from "crypto";
import Database from "@replit/database";

const db = new Database();

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

export class ReplDBStorage implements IStorage {
  constructor() {
    this.initializeData();
  }

  private async initializeData() {
    // Initialize with default members if they don't exist
    const existingMembers = await this.getMembers();
    if (existingMembers.length === 0) {
      const defaultMembers: Member[] = [
        { id: randomUUID(), name: "Ashish", initials: "A", avatarColor: "green", createdAt: new Date() },
        { id: randomUUID(), name: "Gagan", initials: "G", avatarColor: "blue", createdAt: new Date() },
        { id: randomUUID(), name: "He-man", initials: "H", avatarColor: "purple", createdAt: new Date() },
        { id: randomUUID(), name: "Kaushal", initials: "K", avatarColor: "yellow", createdAt: new Date() },
        { id: randomUUID(), name: "Main hoon na", initials: "MH", avatarColor: "pink", createdAt: new Date() },
        { id: randomUUID(), name: "Aswini", initials: "AS", avatarColor: "indigo", createdAt: new Date() },
        { id: randomUUID(), name: "Rahul", initials: "R", avatarColor: "orange", createdAt: new Date() },
        { id: randomUUID(), name: "RK", initials: "RK", avatarColor: "red", createdAt: new Date() },
        { id: randomUUID(), name: "Anjali", initials: "AN", avatarColor: "teal", createdAt: new Date() },
        { id: randomUUID(), name: "Kumar", initials: "KU", avatarColor: "cyan", createdAt: new Date() },
      ];
      await db.set("members", defaultMembers);
    }
  }

  async getMembers(): Promise<Member[]> {
    try {
      const result = await db.get("members");
      console.log('Members result:', result);
      // Handle different possible return formats from ReplDB
      if (result === null || result === undefined) {
        return [];
      }
      if (Array.isArray(result)) {
        return result;
      }
      if (result && typeof result === 'object' && 'ok' in result && result.ok && result.value) {
        return result.value;
      }
      return [];
    } catch (error) {
      console.error('Error getting members:', error);
      return [];
    }
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const members = await this.getMembers();
    const member: Member = {
      ...insertMember,
      id: randomUUID(),
      createdAt: new Date(),
    };
    members.push(member);
    await db.set("members", members);
    return member;
  }

  async getBookings(): Promise<Booking[]> {
    try {
      const result = await db.get("bookings");
      console.log('Bookings result:', result);
      if (result === null || result === undefined) {
        return [];
      }
      if (Array.isArray(result)) {
        return result;
      }
      if (result && typeof result === 'object' && 'ok' in result && result.ok && result.value) {
        return result.value;
      }
      return [];
    } catch (error) {
      console.error('Error getting bookings:', error);
      return [];
    }
  }

  async getBookingsByDate(date: string): Promise<Booking[]> {
    const bookings = await this.getBookings();
    return bookings.filter(booking => booking.date === date);
  }

  async getBookingsByMember(memberId: string): Promise<Booking[]> {
    const bookings = await this.getBookings();
    return bookings.filter(booking => booking.memberId === memberId);
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const bookings = await this.getBookings();
    const booking: Booking = {
      ...insertBooking,
      id: randomUUID(),
      createdAt: new Date(),
    };
    bookings.push(booking);
    await db.set("bookings", bookings);
    return booking;
  }

  async deleteBooking(memberId: string, date: string): Promise<boolean> {
    const bookings = await this.getBookings();
    const filteredBookings = bookings.filter(
      booking => !(booking.memberId === memberId && booking.date === date)
    );
    
    if (filteredBookings.length === bookings.length) {
      return false; // No booking found to delete
    }
    
    await db.set("bookings", filteredBookings);
    return true;
  }

  async getActivities(): Promise<Activity[]> {
    try {
      const result = await db.get("activities");
      console.log('Activities result:', result);
      let allActivities: Activity[] = [];
      if (result === null || result === undefined) {
        allActivities = [];
      } else if (Array.isArray(result)) {
        allActivities = result;
      } else if (result && typeof result === 'object' && 'ok' in result && result.ok && result.value) {
        allActivities = result.value;
      }
      return allActivities.sort((a: Activity, b: Activity) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Error getting activities:', error);
      return [];
    }
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const activities = await this.getActivities();
    const activity: Activity = {
      ...insertActivity,
      id: randomUUID(),
      createdAt: new Date(),
    };
    activities.push(activity);
    await db.set("activities", activities);
    return activity;
  }

  // Comments
  async getComments(): Promise<Comment[]> {
    try {
      const result = await db.get("comments");
      console.log('Comments result:', result);
      
      if (result === null || result === undefined) {
        return [];
      }
      
      if (result && typeof result === 'object' && 'ok' in result) {
        if (result.ok && result.value) {
          return Array.isArray(result.value) ? result.value : [];
        }
        return [];
      }
      
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("Error getting comments:", error);
      return [];
    }
  }

  async getCommentsByDate(date: string): Promise<Comment[]> {
    const allComments = await this.getComments();
    return allComments.filter(comment => comment.date === date);
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const comments = await this.getComments();
    const comment: Comment = {
      ...insertComment,
      id: randomUUID(),
      createdAt: new Date(),
    };
    comments.push(comment);
    await db.set("comments", comments);
    return comment;
  }
}

export const storage = new ReplDBStorage();
