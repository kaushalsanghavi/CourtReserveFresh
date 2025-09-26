import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  bookSlotSchema, 
  insertCommentSchema, 
  timeUpdateSchema, 
  validateBookingRequest,
  type SundayBookingResponse 
} from "@shared/schema";
import { 
  isSundayDate, 
  getUpcomingSundays, 
  groupSundayBookingsByDate, 
  createSundayBookingGroup, 
  toSundayBookingResponse,
  isFutureDate 
} from "@shared/sunday-booking-utils";
import { 
  sundayBookingService,
  processUpcomingSundayBookings,
  processTimeSlotChange,
  processNewBooking
} from "@shared/sunday-booking-service";
import { z } from "zod";

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
  // Get all members
  app.get("/api/members", async (req, res) => {
    try {
      const members = await storage.getMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // Get all bookings with optional type parameter for Sunday bookings
  app.get("/api/bookings", async (req, res) => {
    try {
      const { type } = req.query;
      
      if (type === 'sunday') {
        // Return Sunday bookings grouped by date using the service
        const sundayBookings = await storage.getSundayBookings();
        const sundayBookingResponses = processUpcomingSundayBookings(sundayBookings, 6);
        
        res.json(sundayBookingResponses);
      } else {
        // Return all bookings (default behavior)
        const bookings = await storage.getBookings();
        res.json(bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
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

  // Book a slot (weekday or Sunday)
  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = validateBookingRequest(req.body);
      const { memberId, memberName, date, timeSlot } = validatedData;
      const isSunday = isSundayDate(date);

      // Handle weekday bookings (existing logic)
      if (!isSunday) {
        // Check if date is a weekday
        const bookingDate = new Date(date);
        const dayOfWeek = bookingDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          return res.status(400).json({ message: "Bookings are only allowed on weekdays (Monday-Friday) or Sundays" });
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

        // Create the weekday booking
        const booking = await storage.createBooking({
          memberId,
          memberName,
          date,
          isSundayBooking: false,
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
      } else {
        // Handle Sunday bookings
        if (!isFutureDate(date)) {
          return res.status(400).json({ message: "Cannot book slots for past dates" });
        }

        // Use the service to validate and process the booking
        const existingSundayBookings = await storage.getSundayBookingsByDate(date);
        const bookingRequest = { memberId, memberName, date, timeSlot };
        const processResult = processNewBooking(bookingRequest, existingSundayBookings);

        if (!processResult.success) {
          const errorMessage = processResult.validation.errors[0] || "Invalid booking request";
          return res.status(400).json({ message: errorMessage });
        }

        // Get time slot information from the processing result
        const timeSlotInfo = processResult.timeSlotInfo;
        if (!timeSlotInfo) {
          return res.status(400).json({ message: "Unable to determine time slot for booking" });
        }

        // Create the Sunday booking
        const booking = await storage.createBooking({
          memberId,
          memberName,
          date,
          isSundayBooking: true,
          timeSlot: timeSlotInfo.timeSlot,
          timeSetBy: timeSlotInfo.timeSetBy,
          timeSetAt: timeSlotInfo.timeSetAt,
        });

        // Log the activity
        const deviceInfo = parseUserAgent(req.headers['user-agent'] || '');
        await storage.createActivity({
          memberId,
          memberName,
          action: "booked a Sunday slot for",
          date,
          deviceInfo,
        });

        res.json(booking);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error('Error creating booking:', error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Cancel a booking (weekday or Sunday)
  app.delete("/api/bookings/:memberId/:date", async (req, res) => {
    try {
      const { memberId, date } = req.params;
      
      // Check if this is a Sunday booking to determine activity message
      const isSunday = isSundayDate(date);
      
      const deleted = await storage.deleteBooking(memberId, date);
      
      if (!deleted) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Find member name for activity log
      const members = await storage.getMembers();
      const member = members.find(m => m.id === memberId);
      const memberName = member?.name || "Unknown";

      // Log the activity with appropriate message
      const deviceInfo = parseUserAgent(req.headers['user-agent'] || '');
      const action = isSunday ? "cancelled a Sunday slot for" : "cancelled a slot for";
      
      await storage.createActivity({
        memberId,
        memberName,
        action,
        date,
        deviceInfo,
      });

      res.json({ message: "Booking cancelled successfully" });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // Update time slot for Sunday bookings
  app.put("/api/bookings/:date/time", async (req, res) => {
    try {
      const { date } = req.params;
      const validatedData = timeUpdateSchema.parse(req.body);
      const { timeSlot, memberId } = validatedData;

      // Get existing bookings for validation
      const existingBookings = await storage.getSundayBookingsByDate(date);
      
      // Use the service to validate and process the time slot change
      const changeRequest = {
        date,
        newTimeSlot: timeSlot,
        memberId,
        memberName: '' // We'll get this from members if needed
      };
      
      const processResult = processTimeSlotChange(changeRequest, existingBookings);
      
      if (!processResult.success) {
        const errorMessage = processResult.validation.errors[0] || "Invalid time slot change";
        return res.status(400).json({ message: errorMessage });
      }

      // Update the time slot for all bookings on this date
      const updated = await storage.updateTimeSlot(date, timeSlot, memberId);
      
      if (!updated) {
        return res.status(500).json({ message: "Failed to update time slot" });
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
        action: `set time slot to ${timeSlot} for`,
        date,
        deviceInfo,
      });

      // Return updated Sunday booking data for this date
      const updatedBookings = await storage.getSundayBookingsByDate(date);
      const groups = sundayBookingService.createBookingGroups([date], updatedBookings);
      const responses = sundayBookingService.transformToApiResponse(groups);

      res.json(responses[0] || null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error('Error updating time slot:', error);
      res.status(500).json({ message: "Failed to update time slot" });
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

  const httpServer = createServer(app);
  return httpServer;
}
