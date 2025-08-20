import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { bookSlotSchema } from "@shared/schema";
import { z } from "zod";

function parseUserAgent(userAgent: string): string {
  // Basic user agent parsing for device info
  const isAndroid = userAgent.includes('Android');
  const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');
  const isWindows = userAgent.includes('Windows');
  const isMac = userAgent.includes('Macintosh');
  const isLinux = userAgent.includes('Linux') && !isAndroid;

  if (isAndroid) {
    const androidMatch = userAgent.match(/Android (\d+(?:\.\d+)?)/);
    const version = androidMatch ? androidMatch[1] : 'Unknown';
    return `Android Device (Android ${version})`;
  }
  
  if (isIOS) {
    const iosMatch = userAgent.match(/OS (\d+(?:_\d+)?)/);
    const version = iosMatch ? iosMatch[1].replace('_', '.') : 'Unknown';
    return `iOS Device (iOS ${version})`;
  }
  
  if (isWindows) {
    return 'Windows Device';
  }
  
  if (isMac) {
    return 'Mac Device';
  }
  
  if (isLinux) {
    return 'Linux Device';
  }
  
  return 'Unknown Device';
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all members
  app.get("/api/members", async (req, res) => {
    try {
      const members = await storage.getMembers();
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

      // Check if date is a weekday
      const bookingDate = new Date(date);
      const dayOfWeek = bookingDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return res.status(400).json({ message: "Bookings are only allowed on weekdays (Monday-Friday)" });
      }

      // Check if member already has a booking for this date
      const existingBookings = await storage.getBookingsByDate(date);
      const memberBooking = existingBookings.find(booking => booking.memberId === memberId);
      
      if (memberBooking) {
        return res.status(400).json({ message: "Member already has a booking for this date" });
      }

      // Check if date has reached maximum capacity (6 slots)
      if (existingBookings.length >= 6) {
        return res.status(400).json({ message: "This date is fully booked (6/6 slots)" });
      }

      // Create the booking
      const booking = await storage.createBooking({
        memberId,
        memberName,
        date,
      });

      // Log the activity
      const deviceInfo = parseUserAgent(req.headers['user-agent'] || '');
      await storage.createActivity({
        memberId,
        memberName,
        action: "booked a slot for",
        date,
        deviceInfo,
      });

      res.json(booking);
    } catch (error) {
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

  const httpServer = createServer(app);
  return httpServer;
}
