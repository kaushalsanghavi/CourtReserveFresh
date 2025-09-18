import { GoogleGenerativeAI } from '@google/generative-ai';
import { storage } from './storage';
import { db } from './db';
import { eq, sql, count, desc, and, like, gte, not } from 'drizzle-orm';
import { activities, bookings, members } from '../shared/schema';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});
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
      let filteredBookings = await storage.getBookings();

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
        .where(gte(sql`CAST(strftime('%H', ${activities.createdAt}) AS INTEGER)`, 21))
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
      contextData = await storage.getMembers();
      break;
    default:
      return null;
  }

  return contextData ? JSON.stringify(contextData, null, 2) : null;
}

export async function getAiReply(userMessage: string): Promise<string> {
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