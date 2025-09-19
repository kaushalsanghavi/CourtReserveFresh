import express from "express";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { eq, desc, and, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { Pool } from 'pg'; // Use pg for local development
import { getCurrentSchema } from '../server/db'; // Import getCurrentSchema
import { NodePgDatabase, drizzle as drizzlePg } from 'drizzle-orm/node-postgres';

// Database schema - inlined to avoid import issues
const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  avatarColor: text("avatar_color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  memberName: text("member_name").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  memberName: text("member_name").notNull(),
  action: text("action").notNull(), // "booked" or "cancelled"
  date: text("date").notNull(), // YYYY-MM-DD format
  deviceInfo: text("device_info").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  memberName: text("member_name").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schemas
const bookSlotSchema = z.object({
  memberId: z.string().min(1),
  memberName: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

const schema = {
  members,
  bookings,
  activities,
  comments,
};

// Database setup
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

let db: any;

if (isProduction) {
  const connection = neon(process.env.DATABASE_URL!); // Use Neon for production
  db = drizzleNeon(connection);
} else {
  const currentSchema = getCurrentSchema();
  const connectionString = `${process.env.DATABASE_URL}?options=-c%20search_path%3D${currentSchema}`;
  const pool = new Pool({ connectionString });
  db = drizzlePg(pool, { schema });
}

// Utility functions
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

// Express app setup
const app = express();

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
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

app.delete("/api/bookings/:memberId/:date", async (req, res) => {
  try {
    const { memberId, date } = req.params;
    
    const deleted = await storage.deleteBooking(memberId, date);
    
    if (!deleted) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Find member name for activity log
    const members = await storage.getMembers();
    const member = members.find(m => m.id === memberId);
    const memberName = member?.name || "Unknown";

    // Log the activity
    const deviceInfo = parseUserAgent(req.headers['user-agent'] || '');
    await storage.createActivity({
      memberId,
      memberName,
      action: "cancelled a slot for",
      date,
      deviceInfo,
    });

    res.json({ message: "Booking cancelled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel booking" });
  }
});

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

app.get("/api/activities/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const activities = await storage.getActivitiesByDate(date);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activities for date" });
  }
});

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

app.post("/api/comments", async (req, res) => {
  try {
    const validatedData = insertCommentSchema.parse(req.body);
    const { memberId, memberName, date, comment } = validatedData;

    // Create the comment
    const newComment = await storage.createComment({
      memberId,
      memberName,
      date,
      comment,
    });

    res.json(newComment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create comment" });
  }
});

app.get("/api/comments/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const commentsList = await storage.getCommentsByDate(date);
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

import {
  GoogleGenerativeAI
} from '@google/generative-ai';
import {
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  isWithinInterval,
  parseISO
} from 'date-fns';

const SYSTEM_PROMPT = `
You are an AI assistant for the 'CourtReserve' application. Your ONLY purpose is to answer questions about member information, court bookings, participation statistics, and member activity patterns, including device usage. Use badminton puns and fun language.

**RULES:**
- You MUST NOT answer any questions outside of this scope (e.g., weather, news, general knowledge).
- If asked an irrelevant question, you MUST politely decline with a message like: 'I can only help with questions about CourtReserve. How can I assist with bookings or members today?'
- Use ONLY the data provided in the 'Context' section to answer the user's question. Do not make up information.
`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function generateText(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in the environment variables.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Error generating text from Gemini:", error);
    throw new Error("Failed to generate text from AI model.");
  }
}

function recognizeIntent(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("booking") || lowerMessage.includes("when") || lowerMessage.includes("who booked") || lowerMessage.includes("slots") || lowerMessage.includes("reservation") || lowerMessage.includes("booked the most") || lowerMessage.includes("most booked") || lowerMessage.includes("most reservations")) {
    return "query_bookings";
  }
  if (lowerMessage.includes("participation") || lowerMessage.includes("stats") || lowerMessage.includes("active")) {
    return "query_participation";
  }
  if (lowerMessage.includes("activity") || lowerMessage.includes("device") || lowerMessage.includes("ios") || lowerMessage.includes("android") || lowerMessage.includes("iphone") || lowerMessage.includes("late night") || lowerMessage.includes("morning") || lowerMessage.includes("desktop") || lowerMessage.includes("computer") || lowerMessage.includes("pc") || lowerMessage.includes("non-mobile")) {
    return "query_activity";
  }
  if (lowerMessage.includes("member") || lowerMessage.includes("members") || lowerMessage.includes("player") || lowerMessage.includes("players")) {
    return "query_members";
  }
  return null;
}

async function getContextData(intent: string, message: string): Promise<string | null> {
  console.log("getContextData called with intent:", intent);
  let contextData: any = null;
  const lowerMessage = message.toLowerCase();
  const now = new Date();

  switch (intent) {
    case "query_bookings":
      let filteredBookings = await db.select().from(bookings).orderBy(desc(bookings.createdAt));

      if (lowerMessage.includes("this week")) {
        const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
        filteredBookings = filteredBookings.filter(booking => {
          const bookingDate = parseISO(booking.date);
          return isWithinInterval(bookingDate, { start, end });
        });
      } else if (lowerMessage.includes("today")) {
        const start = startOfDay(now);
        const end = endOfDay(now);
        filteredBookings = filteredBookings.filter(booking => {
          const bookingDate = parseISO(booking.date);
          return isWithinInterval(bookingDate, { start, end });
        });
      } else if (lowerMessage.includes("tomorrow")) {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const start = startOfDay(tomorrow);
        const end = endOfDay(tomorrow);
        filteredBookings = filteredBookings.filter(booking => {
          const bookingDate = parseISO(booking.date);
          return isWithinInterval(bookingDate, { start, end });
        });
      }
      
      if (filteredBookings.length > 0) {
        console.log("Filtered Bookings for Context:", filteredBookings);
        contextData = `The following bookings are relevant: ${JSON.stringify(filteredBookings, null, 2)}`;
      } else {
        contextData = "No relevant bookings found.";
      }
      break;
    case "query_participation":
      // Example: Count bookings per member
      contextData = await db.select({
        memberName: bookings.memberName,
        bookingCount: count(bookings.id),
      })
      .from(bookings)
      .groupBy(bookings.memberName);
      break;
    case "query_activity":
      if (lowerMessage.includes("ios") || lowerMessage.includes("iphone")) {
        const result = await db.select({
          memberName: activities.memberName,
          activityCount: count(activities.id),
        })
        .from(activities)
        .where(like(activities.deviceInfo, '%iOS%'))
        .groupBy(activities.memberName)
        .orderBy(desc(sql`activityCount`));
        if (result.length > 0) {
          contextData = `The following members have shown activity on iOS devices: ${result.map(r => `${r.memberName} (${r.activityCount} activities)`).join(", ")}.`;
        } else {
          contextData = "No members found with activity on iOS devices.";
        }
      } else if (lowerMessage.includes("android")) {
        const result = await db.select({
          memberName: activities.memberName,
          activityCount: count(activities.id),
        })
        .from(activities)
        .where(like(activities.deviceInfo, '%Android%'))
        .groupBy(activities.memberName)
        .orderBy(desc(sql`activityCount`));
        if (result.length > 0) {
          contextData = `The following members have shown activity on Android devices: ${result.map(r => `${r.memberName} (${r.activityCount} activities)`).join(", ")}.`;
        } else {
          contextData = "No members found with activity on Android devices.";
        }
      } else if (lowerMessage.includes("late night")) {
        const result = await db.select({
          memberName: activities.memberName,
          activityCount: count(activities.id),
        })
        .from(activities)
        .where(gte(sql`EXTRACT(HOUR FROM ${activities.createdAt})`, 21))
        .groupBy(activities.memberName)
        .orderBy(desc(sql`activityCount`));
        if (result.length > 0) {
          contextData = `The following members have shown late night activity (after 9 PM): ${result.map(r => `${r.memberName} (${r.activityCount} activities)`).join(", ")}.`;
        } else {
          contextData = "No members found with late night activity.";
        }
      } else if (lowerMessage.includes("morning")) {
        const result = await db.select({
          memberName: activities.memberName,
          activityCount: count(activities.id),
        })
        .from(activities)
        .where(and(gte(sql`CAST(strftime('%H', ${activities.createdAt}) AS INTEGER)`, 6), gte(sql`CAST(strftime('%H', ${activities.createdAt}) AS INTEGER)`, 12)))
        .groupBy(activities.memberName)
        .orderBy(desc(sql`activityCount`));
        if (result.length > 0) {
          contextData = `The following members have shown morning activity (between 6 AM and 12 PM): ${result.map(r => `${r.memberName} (${r.activityCount} activities)`).join(", ")}.`;
        } else {
          contextData = "No members found with morning activity.";
        }
      } else if (lowerMessage.includes("desktop") || lowerMessage.includes("computer") || lowerMessage.includes("pc") || lowerMessage.includes("non-mobile")) {
        const result = await db.select({
          memberName: activities.memberName,
          activityCount: count(activities.id),
        })
        .from(activities)
        .where(and(not(like(activities.deviceInfo, '%iOS%')), not(like(activities.deviceInfo, '%Android%'))))
        .groupBy(activities.memberName)
        .orderBy(desc(sql`activityCount`));
        if (result.length > 0) {
          contextData = `The following members have shown activity on non-mobile devices (desktop/computer): ${result.map(r => `${r.memberName} (${r.activityCount} activities)`).join(", ")}.`;
        } else {
          contextData = "No members found with activity on non-mobile devices.";
        }
      } else {
        // Default activity query
        const result = await db.select({
          memberName: activities.memberName,
          activityCount: count(activities.id),
        })
        .from(activities)
        .groupBy(activities.memberName)
        .orderBy(desc(sql`activityCount`));
        if (result.length > 0) {
          contextData = `The overall activity by members is: ${result.map(r => `${r.memberName} (${r.activityCount} activities)`).join(", ")}.`;
        } else {
          contextData = "No activity data found.";
        }
      }
      break;
    case "query_members":
      contextData = await db.select().from(members).orderBy(desc(members.createdAt));
      break;
    default:
      return null;
  }

  return contextData ? JSON.stringify(contextData, null, 2) : null;
}

async function getAiReply(userMessage: string): Promise<string> {
  let prompt = SYSTEM_PROMPT;

  const intent = recognizeIntent(userMessage);
  let context = null;

  if (intent) {
    context = await getContextData(intent, userMessage);
  }

  if (context) {
    if (intent === "query_bookings") {
      prompt += `\n\n**Context:**\nHere is a list of relevant bookings in JSON format. Please analyze this data to answer the user's question:\n${context}`;
    } else {
      prompt += `\n\n**Context:**\n${context}`;
    }
  }

  prompt += `\n\n**User Question:**\n${userMessage}`;

  return await generateText(prompt);
}

app.post("/api/ai/chat", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: "Invalid request, 'message' is required." });
  }

  try {
    const reply = await getAiReply(message);
    res.json({ reply });
  } catch (error) {
    console.error("Error in AI chat endpoint:", error);
    res.status(500).json({ message: "Failed to get AI reply." });
  }
});

export { getAiReply };

export default async function handler(req: any, res: any) {
  app(req as any, res as any);
}
