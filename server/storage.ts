import { type Member, type InsertMember, type Booking, type InsertBooking, type Activity, type InsertActivity } from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const MEMBERS_FILE = path.join(DATA_DIR, "members.json");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");
const ACTIVITIES_FILE = path.join(DATA_DIR, "activities.json");

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

export class FileStorage implements IStorage {
  constructor() {
    this.ensureDataDir();
    this.initializeData();
  }

  private async ensureDataDir() {
    try {
      await fs.access(DATA_DIR);
    } catch {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
  }

  private async initializeData() {
    // Initialize with default members if files don't exist
    try {
      await fs.access(MEMBERS_FILE);
    } catch {
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
      await this.writeJsonFile(MEMBERS_FILE, defaultMembers);
    }

    try {
      await fs.access(BOOKINGS_FILE);
    } catch {
      await this.writeJsonFile(BOOKINGS_FILE, []);
    }

    try {
      await fs.access(ACTIVITIES_FILE);
    } catch {
      await this.writeJsonFile(ACTIVITIES_FILE, []);
    }
  }

  private async readJsonFile<T>(filePath: string): Promise<T[]> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async writeJsonFile<T>(filePath: string, data: T[]): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async getMembers(): Promise<Member[]> {
    return this.readJsonFile<Member>(MEMBERS_FILE);
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const members = await this.getMembers();
    const member: Member = {
      ...insertMember,
      id: randomUUID(),
      createdAt: new Date(),
    };
    members.push(member);
    await this.writeJsonFile(MEMBERS_FILE, members);
    return member;
  }

  async getBookings(): Promise<Booking[]> {
    return this.readJsonFile<Booking>(BOOKINGS_FILE);
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
    await this.writeJsonFile(BOOKINGS_FILE, bookings);
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
    
    await this.writeJsonFile(BOOKINGS_FILE, filteredBookings);
    return true;
  }

  async getActivities(): Promise<Activity[]> {
    const activities = await this.readJsonFile<Activity>(ACTIVITIES_FILE);
    return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const activities = await this.getActivities();
    const activity: Activity = {
      ...insertActivity,
      id: randomUUID(),
      createdAt: new Date(),
    };
    activities.push(activity);
    await this.writeJsonFile(ACTIVITIES_FILE, activities);
    return activity;
  }
}

export const storage = new FileStorage();
