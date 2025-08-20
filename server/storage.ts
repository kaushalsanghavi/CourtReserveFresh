
import { type Member, type InsertMember, type Booking, type InsertBooking, type Activity, type InsertActivity } from "@shared/schema";
import { randomUUID } from "crypto";
import { Client } from "replit";

const client = new Client();

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
      await client.set("members", defaultMembers);
    }
  }

  async getMembers(): Promise<Member[]> {
    const members = await client.get("members");
    return members || [];
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const members = await this.getMembers();
    const member: Member = {
      ...insertMember,
      id: randomUUID(),
      createdAt: new Date(),
    };
    members.push(member);
    await client.set("members", members);
    return member;
  }

  async getBookings(): Promise<Booking[]> {
    const bookings = await client.get("bookings");
    return bookings || [];
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
    await client.set("bookings", bookings);
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
    
    await client.set("bookings", filteredBookings);
    return true;
  }

  async getActivities(): Promise<Activity[]> {
    const activities = await client.get("activities");
    const allActivities = activities || [];
    return allActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const activities = await this.getActivities();
    const activity: Activity = {
      ...insertActivity,
      id: randomUUID(),
      createdAt: new Date(),
    };
    activities.push(activity);
    await client.set("activities", activities);
    return activity;
  }
}

export const storage = new ReplDBStorage();
