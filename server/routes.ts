import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { bookSlotSchema, insertCommentSchema } from "../shared/schema.js";
import { validateBookingRequest } from "../shared/booking-validation.js";
import {
  isSameDayLockedAfterCutoffInIst,
  SAME_DAY_BOOKING_LOCK_MESSAGE,
} from "../shared/booking-time-policy.js";
import {
  DUPLICATE_BOOKING_MESSAGE,
  isDuplicateBookingError,
} from "../api/booking-errors.js";
import { z } from "zod";
import { getAiReply as getLegacyAiReply } from "./ai.js";
import {
  AiChatRequestError,
  handleAiChatRequest,
  subscribeToAiChatProgress,
} from "./ai/sql-chat-service.js";
import {
  INACTIVE_MEMBER_BOOKING_MESSAGE,
  isMemberActive,
  normalizeMemberStatusFilter,
} from "./member-status.js";

function parseUserAgent(userAgent: string): string {
  if (!userAgent) return 'Unknown Device';

  // More detailed user agent parsing for exact device info
  const isAndroid = userAgent.includes('Android');
  const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');
  const isWindows = userAgent.includes('Windows');
  const isMac = userAgent.includes('Macintosh');
  const isLinux = userAgent.includes('Linux') && !isAndroid;

  // Browser detection
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
    
    // Try to extract device model
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

export async function registerRoutes(app: Express): Promise<Server> {
  await storage.ensureInitialized();

  // Get all members
  app.get("/api/members", async (req, res) => {
    try {
      const status = normalizeMemberStatusFilter(req.query.status);
      if (!status) {
        return res
          .status(400)
          .json({ message: "Invalid member status filter. Use active, inactive, or all." });
      }

      const members = await storage.getMembers(status);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // Get all bookings
  app.get("/api/bookings", async (req, res) => {
    try {
      const bookings = await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Get bookings by date
  app.get("/api/bookings/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const bookings = await storage.getBookingsByDate(date);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings for date" });
    }
  });

  // Book a slot
  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = bookSlotSchema.parse(req.body);
      const { memberId, memberName, date } = validatedData;
      const member = await storage.getMemberById(memberId);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      if (!isMemberActive(member)) {
        return res.status(403).json({ message: INACTIVE_MEMBER_BOOKING_MESSAGE });
      }

      const validationError = await validateBookingRequest({
        date,
        memberId,
        getBookingsByDate: (bookingDate: string) =>
          storage.getBookingsByDate(bookingDate),
      });
      if (validationError) {
        return res
          .status(validationError.status)
          .json({ message: validationError.message });
      }

      // Create the booking
      const booking = await storage.createBooking({
        memberId,
        memberName: member.name,
        date,
      });

      // Log the activity
      const deviceInfo = parseUserAgent(req.headers['user-agent'] || '');
      await storage.createActivity({
        memberId,
        memberName: member.name,
        action: "booked a slot for",
        date,
        deviceInfo,
      });

      res.json(booking);
    } catch (error) {
      if (isDuplicateBookingError(error)) {
        return res.status(409).json({ message: DUPLICATE_BOOKING_MESSAGE });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Cancel a booking
  app.delete("/api/bookings/:memberId/:date", async (req, res) => {
    try {
      const { memberId, date } = req.params;

      if (isSameDayLockedAfterCutoffInIst(date)) {
        return res.status(400).json({ message: SAME_DAY_BOOKING_LOCK_MESSAGE });
      }
      
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

  // Get all activities
  app.get("/api/activities", async (req, res) => {
    try {
      const activities = await storage.getActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Get activities for a specific date
  app.get("/api/activities/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const activities = await storage.getActivitiesByDate(date);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities for date" });
    }
  });

  // Get all comments
  app.get("/api/comments", async (req, res) => {
    try {
      const comments = await storage.getComments();
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Get comments by date
  app.get("/api/comments/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const comments = await storage.getCommentsByDate(date);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments for date" });
    }
  });

  // Add a comment
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

  // AI Chat endpoint
  app.get("/api/ai/chat/stream", (req, res) => {
    const requestId = String(req.query.requestId || "").trim();
    if (!requestId) {
      return res.status(400).json({ message: "requestId is required." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const heartbeat = setInterval(() => {
      res.write(": ping\n\n");
    }, 15000);

    const unsubscribe = subscribeToAiChatProgress(requestId, (event) => {
      res.write(`event: stage\ndata: ${JSON.stringify(event)}\n\n`);
    });

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const response = await handleAiChatRequest(
        {
          message: req.body?.message,
          clientTimeZone: req.body?.clientTimeZone,
          debug: req.body?.debug,
          requestId: req.body?.requestId,
        },
        getLegacyAiReply,
      );
      res.json(response);
    } catch (error) {
      if (error instanceof AiChatRequestError) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("Error in AI chat endpoint:", error);
      res.status(500).json({ message: "Failed to get AI reply." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
