import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';
import { storage } from '../storage';

// Mock the storage layer
vi.mock('../storage', () => ({
  storage: {
    ensureInitialized: vi.fn(),
    getMembers: vi.fn(),
    getSundayBookings: vi.fn(),
    getSundayBookingsByDate: vi.fn(),
    createBooking: vi.fn(),
    deleteBooking: vi.fn(),
    updateTimeSlot: vi.fn(),
    createActivity: vi.fn(),
  }
}));

describe('Sunday Booking API Endpoints', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    vi.clearAllMocks();
  });

  describe('GET /api/bookings?type=sunday', () => {
    it('should return upcoming Sunday booking slots', async () => {
      // Mock storage methods
      (storage.getSundayBookings as any).mockResolvedValue([
        {
          id: '1',
          memberId: 'member1',
          memberName: 'John Doe',
          date: '2025-01-05', // A Sunday
          isSundayBooking: true,
          timeSlot: '8:00 AM - 9:00 AM',
          timeSetBy: 'member1',
          timeSetAt: new Date('2025-01-01'),
          createdAt: new Date('2025-01-01')
        }
      ]);

      await registerRoutes(app);
      
      const response = await request(app)
        .get('/api/bookings?type=sunday')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Check the structure of the first Sunday booking response
      const firstSunday = response.body[0];
      expect(firstSunday).toHaveProperty('date');
      expect(firstSunday).toHaveProperty('timeSlot');
      expect(firstSunday).toHaveProperty('timeSetBy');
      expect(firstSunday).toHaveProperty('participants');
      expect(firstSunday).toHaveProperty('availableSpots');
    });
  });

  describe('POST /api/bookings (Sunday booking)', () => {
    it('should create a Sunday booking with time slot', async () => {
      // Use a future Sunday date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (7 - futureDate.getDay()) + 7); // Next Sunday + 1 week
      const futureDateString = futureDate.toISOString().split('T')[0];

      const mockBooking = {
        id: '1',
        memberId: 'member1',
        memberName: 'John Doe',
        date: futureDateString,
        isSundayBooking: true,
        timeSlot: '8:00 AM - 9:00 AM',
        timeSetBy: 'member1',
        timeSetAt: new Date(),
        createdAt: new Date()
      };

      (storage.getSundayBookingsByDate as any).mockResolvedValue([]);
      (storage.createBooking as any).mockResolvedValue(mockBooking);
      (storage.createActivity as any).mockResolvedValue({});

      await registerRoutes(app);

      const response = await request(app)
        .post('/api/bookings')
        .send({
          memberId: 'member1',
          memberName: 'John Doe',
          date: futureDateString,
          timeSlot: '8:00 AM - 9:00 AM'
        });

      if (response.status !== 200) {
        console.log('Error response:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: mockBooking.id,
        memberId: mockBooking.memberId,
        memberName: mockBooking.memberName,
        date: mockBooking.date,
        isSundayBooking: mockBooking.isSundayBooking,
        timeSlot: mockBooking.timeSlot,
        timeSetBy: mockBooking.timeSetBy,
      });
      expect(storage.createBooking).toHaveBeenCalledWith({
        memberId: 'member1',
        memberName: 'John Doe',
        date: futureDateString,
        isSundayBooking: true,
        timeSlot: '8:00 AM - 9:00 AM',
        timeSetBy: 'member1',
        timeSetAt: expect.any(Date)
      });
    });

    it('should reject Sunday booking with invalid time slot', async () => {
      // Use a future Sunday date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (7 - futureDate.getDay()) + 7);
      const futureDateString = futureDate.toISOString().split('T')[0];

      await registerRoutes(app);

      const response = await request(app)
        .post('/api/bookings')
        .send({
          memberId: 'member1',
          memberName: 'John Doe',
          date: futureDateString,
          timeSlot: 'invalid time'
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/bookings/:date/time', () => {
    it('should update time slot for Sunday booking', async () => {
      // Use a future Sunday date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (7 - futureDate.getDay()) + 7);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const mockUpdatedBookings = [
        {
          id: '1',
          memberId: 'member1',
          memberName: 'John Doe',
          date: futureDateString,
          isSundayBooking: true,
          timeSlot: '9:00 AM - 10:00 AM',
          timeSetBy: 'member2',
          timeSetAt: new Date(),
          createdAt: new Date()
        }
      ];

      (storage.updateTimeSlot as any).mockResolvedValue(true);
      (storage.getSundayBookingsByDate as any).mockResolvedValue(mockUpdatedBookings);
      (storage.getMembers as any).mockResolvedValue([
        { id: 'member2', name: 'Jane Doe' }
      ]);
      (storage.createActivity as any).mockResolvedValue({});

      await registerRoutes(app);

      const response = await request(app)
        .put(`/api/bookings/${futureDateString}/time`)
        .send({
          timeSlot: '9:00 AM - 10:00 AM',
          memberId: 'member2'
        });

      if (response.status !== 200) {
        console.log('Error response:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('date', futureDateString);
      expect(response.body).toHaveProperty('timeSlot', '9:00 AM - 10:00 AM');
      expect(storage.updateTimeSlot).toHaveBeenCalledWith(futureDateString, '9:00 AM - 10:00 AM', 'member2');
    });

    it('should reject time slot update for non-Sunday dates', async () => {
      // Use a future Monday date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (7 - futureDate.getDay()) + 8); // Next Monday + 1 week
      const futureDateString = futureDate.toISOString().split('T')[0];

      await registerRoutes(app);

      const response = await request(app)
        .put(`/api/bookings/${futureDateString}/time`)
        .send({
          timeSlot: '9:00 AM - 10:00 AM',
          memberId: 'member1'
        })
        .expect(400);

      expect(response.body.message).toContain('Sunday bookings');
    });
  });

  describe('DELETE /api/bookings/:memberId/:date (Sunday booking)', () => {
    it('should cancel Sunday booking', async () => {
      // Use a future Sunday date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (7 - futureDate.getDay()) + 7);
      const futureDateString = futureDate.toISOString().split('T')[0];

      (storage.deleteBooking as any).mockResolvedValue(true);
      (storage.getMembers as any).mockResolvedValue([
        { id: 'member1', name: 'John Doe' }
      ]);
      (storage.createActivity as any).mockResolvedValue({});

      await registerRoutes(app);

      const response = await request(app)
        .delete(`/api/bookings/member1/${futureDateString}`)
        .expect(200);

      expect(response.body.message).toBe('Booking cancelled successfully');
      expect(storage.deleteBooking).toHaveBeenCalledWith('member1', futureDateString);
      expect(storage.createActivity).toHaveBeenCalledWith({
        memberId: 'member1',
        memberName: 'John Doe',
        action: 'cancelled a Sunday slot for',
        date: futureDateString,
        deviceInfo: expect.any(String)
      });
    });
  });
});