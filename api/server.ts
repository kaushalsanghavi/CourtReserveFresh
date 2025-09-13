// Self-contained server for Vercel deployment
import express from "express";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { members, bookings, activities, comments, bookSlotSchema, insertCommentSchema } from "../shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";
import type { Express } from "express";

// Database setup
const connection = neon(process.env.DATABASE_URL!);
const db = drizzle(connection);

// Utility function
function generateUuid(): string {
  const g: any = (globalThis as any);
  if (g.crypto && typeof g.crypto.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function parseUserAgent(userAgent: string): string {
  if (!userAgent) return 'Unknown Device';

  const isAndroid = userAgent.includes('Android');
  const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');
  const isWindows = userAgent.includes('Windows');
  const isMac = userAgent.includes('Macintosh');
  const isLinux = userAgent.includes('Linux') && !isAndroid;

  const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edg');
  const isFirefox = userAgent.includes('Firefox');
  const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
  const isEdge = userAgent.includes('Edg');

  let browserName = 'Unknown Browser';
  if (isChrome) browserName = 'Chrome';
  else if (isFirefox) browserName = 'Firefox';
  else if (isSafari) browserName = 'Safari';
  else if (isEdge) browserName = 'Edge';

  if (isAndroid) {
    const androidMatch = userAgent.match(/Android (\d+(?:\.\d+)?)/);
    const version = androidMatch ? androidMatch[1] : 'Unknown';
    const modelMatch = userAgent.match(/;\s*([^)]+)\)/);
    const deviceModel = modelMatch ? modelMatch[1].replace(/[;,]/g, '').trim() : 'Unknown Device';
    return `${deviceModel} (Android ${version}) - ${browserName}`;
  }
  
  if (isIOS) {
    const iosMatch = userAgent.match(/OS (\d+(?:_\d+)*)/);
    const version = iosMatch ? iosMatch[1].replace(/_/g, '.') : 'Unknown';
    const isIPhone = userAgent.includes('iPhone');
    const isIPad = userAgent.includes('iPad');
    const deviceType = isIPad ? 'iPad' : isIPhone ? 'iPhone' : 'iOS Device';
    return `${deviceType} (iOS ${version}) - ${browserName}`;
  }
  
  if (isWindows) {
    const windowsMatch = userAgent.match(/Windows NT (\d+\.\d+)/);
    const version = windowsMatch ? windowsMatch[1] : 'Unknown';
    const windowsVersion = version === '10.0' ? 'Windows 10' : 
                          version === '6.3' ? 'Windows 8.1' :
                          version === '6.1' ? 'Windows 7' : `Windows NT ${version}`;
    return `${windowsVersion} Desktop - ${browserName}`;
  }
  
  if (isMac) {
    const macMatch = userAgent.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/);
    const version = macMatch ? macMatch[1].replace(/_/g, '.') : 'Unknown';
    return `Mac Desktop (macOS ${version}) - ${browserName}`;
  }
  
  if (isLinux) {
    return `Linux Desktop - ${browserName}`;
  }
  
  return `Unknown Device - ${browserName}`;
}

// Storage class
class DatabaseStorage {
  // Members
  async getMembers() {
    return await db.select().from(members).orderBy(members.name);
  }

  async createMember(member: any) {
    const [newMember] = await db.insert(members).values({
      ...member,
      id: generateUuid(),
    }).returning();
    return newMember;
  }

  // Bookings
  async getBookings() {
    return await db.select({
      id: bookings.id,
      memberId: bookings.memberId,
      memberName: bookings.memberName,
      date: bookings.date,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .orderBy(desc(bookings.createdAt));
  }

  async getBookingsByDate(date: string) {
    return await db.select({
      id: bookings.id,
      memberId: bookings.memberId,
      memberName: bookings.memberName,
      date: bookings.date,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .where(eq(bookings.date, date))
    .orderBy(bookings.createdAt);
  }

  async getBookingsByMember(memberId: string) {
    return await db.select({
      id: bookings.id,
      memberId: bookings.memberId,
      memberName: bookings.memberName,
      date: bookings.date,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .where(eq(bookings.memberId, memberId))
    .orderBy(desc(bookings.createdAt));
  }

  async createBooking(booking: any) {
    const [newBooking] = await db.insert(bookings).values({
      ...booking,
      id: generateUuid(),
    }).returning();
    return newBooking;
  }

  async deleteBooking(memberId: string, date: string) {
    const result = await db.delete(bookings)
      .where(and(eq(bookings.memberId, memberId), eq(bookings.date, date)));
    return result.rowCount > 0;
  }

  // Activities
  async getActivities() {
    return await db.select().from(activities).orderBy(desc(activities.createdAt));
  }

  async getActivitiesByDate(date: string) {
    return await db.select()
      .from(activities)
      .where(eq(activities.date, date))
      .orderBy(desc(activities.createdAt));
  }

  async createActivity(activity: any) {
    const [newActivity] = await db.insert(activities).values({
      ...activity,
      id: generateUuid(),
    }).returning();
    return newActivity;
  }

  // Comments
  async getComments() {
    return await db.select({
      id: comments.id,
      memberId: comments.memberId,
      memberName: comments.memberName,
      date: comments.date,
      comment: comments.comment,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .orderBy(desc(comments.createdAt));
  }

  async getCommentsByDate(date: string) {
    return await db.select({
      id: comments.id,
      memberId: comments.memberId,
      memberName: comments.memberName,
      date: comments.date,
      comment: comments.comment,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(eq(comments.date, date))
    .orderBy(desc(comments.createdAt));
  }

  async createComment(comment: any) {
    const [newComment] = await db.insert(comments).values({
      ...comment,
      id: generateUuid(),
    }).returning();
    return newComment;
  }
}

const storage = new DatabaseStorage();

// Routes setup
export async function setupRoutes(app: Express) {
  // Members routes
  app.get("/api/members", async (req, res) => {
    try {
      const memberList = await storage.getMembers();
      res.json(memberList);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.post("/api/members", async (req, res) => {
    try {
      const member = await storage.createMember(req.body);
      res.json(member);
    } catch (error) {
      console.error("Error creating member:", error);
      res.status(500).json({ error: "Failed to create member" });
    }
  });

  // Bookings routes
  app.get("/api/bookings", async (req, res) => {
    try {
      const { date, memberId } = req.query;
      
      let bookingList;
      if (date) {
        bookingList = await storage.getBookingsByDate(date as string);
      } else if (memberId) {
        bookingList = await storage.getBookingsByMember(memberId as string);
      } else {
        bookingList = await storage.getBookings();
      }
      
      res.json(bookingList);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const bookingData = bookSlotSchema.parse(req.body);
      const deviceInfo = parseUserAgent(req.headers['user-agent'] || '');
      
      const booking = await storage.createBooking({
        ...bookingData,
      });

      await storage.createActivity({
        memberId: bookingData.memberId,
        memberName: bookingData.memberName,
        action: 'booked',
        date: bookingData.date,
        deviceInfo,
      });

      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid booking data", details: error.errors });
      } else {
        console.error("Error creating booking:", error);
        res.status(500).json({ error: "Failed to create booking" });
      }
    }
  });

  app.delete("/api/bookings", async (req, res) => {
    try {
      const { memberId, date } = req.query;
      
      if (!memberId || !date) {
        return res.status(400).json({ error: "memberId and date are required" });
      }

      const success = await storage.deleteBooking(memberId as string, date as string);
      
      if (success) {
        const deviceInfo = parseUserAgent(req.headers['user-agent'] || '');
        // Get member name for activity
        const memberList = await storage.getMembers();
        const member = memberList.find(m => m.id === memberId);
        
        await storage.createActivity({
          memberId: memberId as string,
          memberName: member?.name || 'Unknown',
          action: 'cancelled',
          date: date as string,
          deviceInfo,
        });
        
        res.json({ message: "Booking deleted successfully" });
      } else {
        res.status(404).json({ error: "Booking not found" });
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ error: "Failed to delete booking" });
    }
  });

  // Activities routes
  app.get("/api/activities", async (req, res) => {
    try {
      const { date } = req.query;
      
      let activitiesList;
      if (date) {
        activitiesList = await storage.getActivitiesByDate(date as string);
      } else {
        activitiesList = await storage.getActivities();
      }
      
      res.json(activitiesList);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // Comments routes
  app.get("/api/comments", async (req, res) => {
    try {
      const { date } = req.query;
      
      let commentsList;
      if (date) {
        commentsList = await storage.getCommentsByDate(date as string);
      } else {
        commentsList = await storage.getComments();
      }
      
      res.json(commentsList);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const commentData = insertCommentSchema.parse({
        ...req.body,
        date
      });
      
      const comment = await storage.createComment(commentData);
      
      const deviceInfo = parseUserAgent(req.headers['user-agent'] || '');
      await storage.createActivity({
        memberId: commentData.memberId,
        memberName: commentData.memberName,
        action: 'commented',
        date: date,
        deviceInfo,
      });

      res.json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid comment data", details: error.errors });
      } else {
        console.error("Error creating comment:", error);
        res.status(500).json({ error: "Failed to create comment" });
      }
    }
  });

  return app;
}