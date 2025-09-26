import { describe, it, expect } from 'vitest';
import {
  isSundayDate,
  isValidTimeSlot,
  isFutureDate,
  isFutureSunday,
  getUpcomingSundays,
  groupSundayBookingsByDate,
  createSundayBookingGroup,
  validateSundayBookingRequest,
  canModifyTimeSlot,
  parseTimeSlot,
  formatTimeSlot,
} from '../sunday-booking-utils';
import {
  bookSlotSchema,
  timeUpdateSchema,
  sundayBookingWithTimeSchema,
  validateBookingRequest,
} from '../schema';
import type { Booking } from '../schema';

describe('Sunday Booking Helper Functions', () => {
  describe('isSundayDate', () => {
    it('should return true for Sunday dates', () => {
      expect(isSundayDate('2024-01-07')).toBe(true); // Sunday
      expect(isSundayDate('2024-01-14')).toBe(true); // Sunday
    });

    it('should return false for non-Sunday dates', () => {
      expect(isSundayDate('2024-01-08')).toBe(false); // Monday
      expect(isSundayDate('2024-01-12')).toBe(false); // Friday
    });
  });

  describe('isValidTimeSlot', () => {
    it('should validate correct time slot formats', () => {
      expect(isValidTimeSlot('8:00 AM - 9:00 AM')).toBe(true);
      expect(isValidTimeSlot('10:30 AM - 11:30 AM')).toBe(true);
      expect(isValidTimeSlot('2:15 PM - 3:15 PM')).toBe(true);
      expect(isValidTimeSlot('12:00 PM - 1:00 PM')).toBe(true);
    });

    it('should reject invalid time slot formats', () => {
      expect(isValidTimeSlot('8:00 - 9:00')).toBe(false); // Missing AM/PM
      expect(isValidTimeSlot('8 AM - 9 AM')).toBe(false); // Missing minutes
      expect(isValidTimeSlot('25:00 AM - 26:00 AM')).toBe(false); // Invalid hours
      expect(isValidTimeSlot('8:60 AM - 9:60 AM')).toBe(false); // Invalid minutes
      expect(isValidTimeSlot('8:00 AM')).toBe(false); // Missing end time
    });
  });

  describe('isFutureDate', () => {
    it('should return true for future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      expect(isFutureDate(tomorrowStr)).toBe(true);
    });

    it('should return true for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isFutureDate(today)).toBe(true);
    });

    it('should return false for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      expect(isFutureDate(yesterdayStr)).toBe(false);
    });
  });

  describe('getUpcomingSundays', () => {
    it('should return the correct number of upcoming Sundays', () => {
      const sundays = getUpcomingSundays(4);
      expect(sundays).toHaveLength(4);
      
      // Verify all returned dates are Sundays
      sundays.forEach(date => {
        expect(isSundayDate(date)).toBe(true);
      });
    });

    it('should return Sundays in chronological order', () => {
      const sundays = getUpcomingSundays(3);
      for (let i = 1; i < sundays.length; i++) {
        expect(new Date(sundays[i]) > new Date(sundays[i - 1])).toBe(true);
      }
    });
  });

  describe('parseTimeSlot', () => {
    it('should parse valid time slots', () => {
      const result = parseTimeSlot('8:00 AM - 9:00 AM');
      expect(result).toEqual({
        start: '8:00 AM',
        end: '9:00 AM',
      });
    });

    it('should return null for invalid time slots', () => {
      expect(parseTimeSlot('invalid')).toBeNull();
      expect(parseTimeSlot('8:00 AM')).toBeNull();
    });
  });

  describe('formatTimeSlot', () => {
    it('should format time slots correctly', () => {
      expect(formatTimeSlot('8:00 AM', '9:00 AM')).toBe('8:00 AM - 9:00 AM');
      expect(formatTimeSlot('2:30 PM', '3:30 PM')).toBe('2:30 PM - 3:30 PM');
    });
  });
});

describe('Sunday Booking Validation Schemas', () => {
  describe('bookSlotSchema', () => {
    it('should validate correct booking requests', () => {
      // Get a future Sunday date
      const futureSundays = getUpcomingSundays(1);
      const validBooking = {
        memberId: 'member-1',
        memberName: 'John Doe',
        date: futureSundays[0], // Future Sunday
        timeSlot: '8:00 AM - 9:00 AM',
      };

      expect(() => bookSlotSchema.parse(validBooking)).not.toThrow();
    });

    it('should reject invalid date formats', () => {
      const invalidBooking = {
        memberId: 'member-1',
        memberName: 'John Doe',
        date: '01/05/2025', // Wrong format
      };

      expect(() => bookSlotSchema.parse(invalidBooking)).toThrow();
    });

    it('should reject past dates', () => {
      const pastBooking = {
        memberId: 'member-1',
        memberName: 'John Doe',
        date: '2020-01-05', // Past date
      };

      expect(() => bookSlotSchema.parse(pastBooking)).toThrow();
    });
  });

  describe('timeUpdateSchema', () => {
    it('should validate correct time updates', () => {
      const validUpdate = {
        timeSlot: '10:00 AM - 11:00 AM',
        memberId: 'member-1',
      };

      expect(() => timeUpdateSchema.parse(validUpdate)).not.toThrow();
    });

    it('should reject invalid time slot formats', () => {
      const invalidUpdate = {
        timeSlot: '10:00 - 11:00', // Missing AM/PM
        memberId: 'member-1',
      };

      expect(() => timeUpdateSchema.parse(invalidUpdate)).toThrow();
    });
  });

  describe('sundayBookingWithTimeSchema', () => {
    it('should validate Sunday bookings with time slots', () => {
      // Get a future Sunday date
      const futureSundays = getUpcomingSundays(1);
      const validSundayBooking = {
        memberId: 'member-1',
        memberName: 'John Doe',
        date: futureSundays[0], // Future Sunday
        timeSlot: '8:00 AM - 9:00 AM',
      };

      expect(() => sundayBookingWithTimeSchema.parse(validSundayBooking)).not.toThrow();
    });

    it('should reject non-Sunday dates', () => {
      // Get a future weekday
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (tomorrow.getDay() === 0) { // If tomorrow is Sunday, use day after
        tomorrow.setDate(tomorrow.getDate() + 1);
      }
      const weekdayDate = tomorrow.toISOString().split('T')[0];
      
      const nonSundayBooking = {
        memberId: 'member-1',
        memberName: 'John Doe',
        date: weekdayDate, // Future weekday (not Sunday)
        timeSlot: '8:00 AM - 9:00 AM',
      };

      expect(() => sundayBookingWithTimeSchema.parse(nonSundayBooking)).toThrow();
    });
  });

  describe('validateBookingRequest', () => {
    it('should handle Sunday bookings correctly', () => {
      // Get a future Sunday date
      const futureSundays = getUpcomingSundays(1);
      const sundayBooking = {
        memberId: 'member-1',
        memberName: 'John Doe',
        date: futureSundays[0], // Future Sunday
        timeSlot: '8:00 AM - 9:00 AM',
      };

      const result = validateBookingRequest(sundayBooking);
      expect(result.isSundayBooking).toBe(true);
      expect(result.timeSlot).toBe('8:00 AM - 9:00 AM');
    });

    it('should handle weekday bookings correctly', () => {
      // Get a future weekday (tomorrow if it's not Sunday, otherwise day after tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (tomorrow.getDay() === 0) { // If tomorrow is Sunday, use day after
        tomorrow.setDate(tomorrow.getDate() + 1);
      }
      const weekdayDate = tomorrow.toISOString().split('T')[0];
      
      const weekdayBooking = {
        memberId: 'member-1',
        memberName: 'John Doe',
        date: weekdayDate, // Future weekday
      };

      const result = validateBookingRequest(weekdayBooking);
      expect(result.isSundayBooking).toBe(false);
      expect(result.timeSlot).toBeUndefined();
    });
  });
});

describe('Sunday Booking Data Processing', () => {
  const mockBookings: Booking[] = [
    {
      id: '1',
      memberId: 'member-1',
      memberName: 'John Doe',
      date: '2025-01-05',
      isSundayBooking: true,
      timeSlot: '8:00 AM - 9:00 AM',
      timeSetBy: 'member-1',
      timeSetAt: new Date('2025-01-01'),
      createdAt: new Date('2025-01-01'),
    },
    {
      id: '2',
      memberId: 'member-2',
      memberName: 'Jane Smith',
      date: '2025-01-05',
      isSundayBooking: true,
      timeSlot: '8:00 AM - 9:00 AM',
      timeSetBy: 'member-1',
      timeSetAt: new Date('2025-01-01'),
      createdAt: new Date('2025-01-02'),
    },
    {
      id: '3',
      memberId: 'member-3',
      memberName: 'Bob Wilson',
      date: '2025-01-06',
      isSundayBooking: false,
      timeSlot: null,
      timeSetBy: null,
      timeSetAt: null,
      createdAt: new Date('2025-01-01'),
    },
  ];

  describe('groupSundayBookingsByDate', () => {
    it('should group Sunday bookings by date', () => {
      const grouped = groupSundayBookingsByDate(mockBookings);
      expect(grouped['2025-01-05']).toHaveLength(2);
      expect(grouped['2025-01-06']).toBeUndefined(); // Weekday booking should be filtered out
    });
  });

  describe('createSundayBookingGroup', () => {
    it('should create a Sunday booking group with correct data', () => {
      const sundayBookings = mockBookings.filter(b => b.isSundayBooking);
      const group = createSundayBookingGroup('2025-01-05', sundayBookings);
      
      expect(group.date).toBe('2025-01-05');
      expect(group.timeSlot).toBe('8:00 AM - 9:00 AM');
      expect(group.timeSetBy).toBe('member-1');
      expect(group.participants).toHaveLength(2);
      expect(group.availableSpots).toBe(4); // 6 - 2 = 4
    });

    it('should handle empty booking groups', () => {
      const group = createSundayBookingGroup('2025-01-12', []);
      
      expect(group.date).toBe('2025-01-12');
      expect(group.timeSlot).toBeNull();
      expect(group.timeSetBy).toBeNull();
      expect(group.participants).toHaveLength(0);
      expect(group.availableSpots).toBe(6);
    });
  });
});