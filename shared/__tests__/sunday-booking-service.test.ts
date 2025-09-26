import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SundayBookingServiceImpl, 
  sundayBookingService,
  processUpcomingSundayBookings,
  processTimeSlotChange,
  processNewBooking,
  getSundayBookingStats
} from '../sunday-booking-service';
import { Booking } from '../schema';

describe('SundayBookingService', () => {
  let service: SundayBookingServiceImpl;
  let mockBookings: Booking[];

  beforeEach(() => {
    service = new SundayBookingServiceImpl();
    
    // Create mock bookings for testing - using future dates
    mockBookings = [
      {
        id: '1',
        memberId: 'member1',
        memberName: 'John Doe',
        date: '2025-10-05', // Future Sunday
        isSundayBooking: true,
        timeSlot: '9:00 AM - 10:00 AM',
        timeSetBy: 'member1',
        timeSetAt: new Date('2025-10-03'),
        createdAt: new Date('2025-10-03')
      },
      {
        id: '2',
        memberId: 'member2',
        memberName: 'Jane Smith',
        date: '2025-10-05', // Future Sunday
        isSundayBooking: true,
        timeSlot: '9:00 AM - 10:00 AM',
        timeSetBy: 'member1',
        timeSetAt: new Date('2025-10-03'),
        createdAt: new Date('2025-10-04')
      },
      {
        id: '3',
        memberId: 'member3',
        memberName: 'Bob Johnson',
        date: '2025-10-12', // Future Sunday
        isSundayBooking: true,
        timeSlot: null,
        timeSetBy: null,
        timeSetAt: null,
        createdAt: new Date('2025-10-04')
      }
    ];
  });

  describe('groupBookingsByDate', () => {
    it('should group Sunday bookings by date', () => {
      const grouped = service.groupBookingsByDate(mockBookings);
      
      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped['2025-10-05']).toHaveLength(2);
      expect(grouped['2025-10-12']).toHaveLength(1);
    });

    it('should filter out non-Sunday bookings', () => {
      const mixedBookings = [
        ...mockBookings,
        {
          id: '4',
          memberId: 'member4',
          memberName: 'Alice Brown',
          date: '2025-10-06', // Monday
          isSundayBooking: false,
          timeSlot: null,
          timeSetBy: null,
          timeSetAt: null,
          createdAt: new Date('2025-10-04')
        }
      ];

      const grouped = service.groupBookingsByDate(mixedBookings);
      expect(Object.keys(grouped)).toHaveLength(2); // Still only 2 Sunday dates
      expect(grouped['2025-10-06']).toBeUndefined();
    });
  });

  describe('createBookingGroups', () => {
    it('should create booking groups for given dates', () => {
      const dates = ['2025-10-05', '2025-10-12', '2025-10-19'];
      const groups = service.createBookingGroups(dates, mockBookings);
      
      expect(groups).toHaveLength(3);
      expect(groups[0].date).toBe('2025-10-05');
      expect(groups[0].participants).toHaveLength(2);
      expect(groups[0].availableSpots).toBe(4);
      
      expect(groups[1].date).toBe('2025-10-12');
      expect(groups[1].participants).toHaveLength(1);
      expect(groups[1].availableSpots).toBe(5);
      
      expect(groups[2].date).toBe('2025-10-19');
      expect(groups[2].participants).toHaveLength(0);
      expect(groups[2].availableSpots).toBe(6);
    });
  });

  describe('canSetTimeSlot', () => {
    it('should allow setting time slot for future Sunday with no existing bookings', () => {
      const futureDate = '2025-10-19'; // Future Sunday
      const result = service.canSetTimeSlot(futureDate, []);
      expect(result).toBe(true);
    });

    it('should allow setting time slot when existing bookings have no time slot', () => {
      const bookingsWithoutTime = [
        {
          ...mockBookings[2],
          timeSlot: null,
          timeSetBy: null,
          timeSetAt: null
        }
      ];
      
      const result = service.canSetTimeSlot('2025-10-12', bookingsWithoutTime);
      expect(result).toBe(true);
    });

    it('should not allow setting time slot when time is already set', () => {
      const bookingsWithTime = mockBookings.filter(b => b.date === '2025-10-05');
      const result = service.canSetTimeSlot('2025-10-05', bookingsWithTime);
      expect(result).toBe(false);
    });

    it('should not allow setting time slot for past dates', () => {
      const pastDate = '2024-12-29'; // Past Sunday
      const result = service.canSetTimeSlot(pastDate, []);
      expect(result).toBe(false);
    });

    it('should not allow setting time slot for non-Sunday dates', () => {
      const mondayDate = '2025-10-06'; // Monday
      const result = service.canSetTimeSlot(mondayDate, []);
      expect(result).toBe(false);
    });
  });

  describe('canModifyTimeSlot', () => {
    it('should allow modifying time slot for future Sunday', () => {
      const futureDate = '2025-10-05';
      const result = service.canModifyTimeSlot(futureDate, mockBookings);
      expect(result).toBe(true);
    });

    it('should not allow modifying time slot for past dates', () => {
      const pastDate = '2024-12-29';
      const result = service.canModifyTimeSlot(pastDate, []);
      expect(result).toBe(false);
    });

    it('should not allow modifying time slot for non-Sunday dates', () => {
      const mondayDate = '2025-10-06';
      const result = service.canModifyTimeSlot(mondayDate, []);
      expect(result).toBe(false);
    });
  });

  describe('validateTimeSlotChange', () => {
    it('should validate correct time slot change', () => {
      const result = service.validateTimeSlotChange('2025-10-05', '10:00 AM - 11:00 AM', 'member1');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
    });

    it('should reject invalid time slot format', () => {
      const result = service.validateTimeSlotChange('2025-10-05', 'invalid-time', 'member1');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Time slot must be in format 'HH:MM AM/PM - HH:MM AM/PM'");
    });

    it('should reject past dates', () => {
      const result = service.validateTimeSlotChange('2024-12-29', '10:00 AM - 11:00 AM', 'member1');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot modify time slots for past dates');
    });

    it('should reject non-Sunday dates', () => {
      const result = service.validateTimeSlotChange('2025-10-06', '10:00 AM - 11:00 AM', 'member1');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Time slots can only be set for Sunday bookings');
    });

    it('should reject empty member ID', () => {
      const result = service.validateTimeSlotChange('2025-10-05', '10:00 AM - 11:00 AM', '');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Member ID is required for time slot changes');
    });
  });

  describe('validateBookingCapacity', () => {
    it('should allow booking when under capacity', () => {
      const bookings = mockBookings.filter(b => b.date === '2025-10-05'); // 2 bookings
      const result = service.validateBookingCapacity('2025-10-05', bookings);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject booking when at capacity', () => {
      const fullBookings = Array.from({ length: 6 }, (_, i) => ({
        ...mockBookings[0],
        id: `booking-${i}`,
        memberId: `member-${i}`,
        memberName: `Member ${i}`
      }));
      
      const result = service.validateBookingCapacity('2025-10-05', fullBookings);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This Sunday is fully booked (6/6 slots)');
    });
  });

  describe('validateNewBooking', () => {
    it('should validate correct new booking with time slot', () => {
      const existingBookings = mockBookings.filter(b => b.date === '2025-10-12');
      const result = service.validateNewBooking('newMember', '2025-10-12', existingBookings, '10:00 AM - 11:00 AM');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
    });

    it('should validate new booking without time slot when time already set', () => {
      const existingBookings = mockBookings.filter(b => b.date === '2025-10-05');
      const result = service.validateNewBooking('newMember', '2025-10-05', existingBookings);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject booking for member who already has booking', () => {
      const existingBookings = mockBookings.filter(b => b.date === '2025-10-05');
      const result = service.validateNewBooking('member1', '2025-10-05', existingBookings);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Member already has a booking for this Sunday');
    });

    it('should reject booking when at capacity', () => {
      const fullBookings = Array.from({ length: 6 }, (_, i) => ({
        ...mockBookings[0],
        id: `booking-${i}`,
        memberId: `member-${i}`,
        memberName: `Member ${i}`
      }));
      
      const result = service.validateNewBooking('newMember', '2025-10-05', fullBookings);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This Sunday is fully booked (6/6 slots)');
    });

    it('should require time slot for first booking', () => {
      const result = service.validateNewBooking('member1', '2025-10-19', []);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Time slot is required for the first Sunday booking');
    });

    it('should reject past dates', () => {
      const result = service.validateNewBooking('member1', '2024-12-29', [], '10:00 AM - 11:00 AM');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot book slots for past dates');
    });

    it('should reject non-Sunday dates', () => {
      const result = service.validateNewBooking('member1', '2025-10-06', [], '10:00 AM - 11:00 AM');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This booking type is only available for Sundays');
    });
  });

  describe('helper functions', () => {
    it('should calculate available spots correctly', () => {
      const bookings = mockBookings.filter(b => b.date === '2025-10-05'); // 2 bookings
      const availableSpots = service.getAvailableSpots(bookings);
      expect(availableSpots).toBe(4);
    });

    it('should identify full bookings', () => {
      const partialBookings = mockBookings.filter(b => b.date === '2025-10-05');
      const fullBookings = Array.from({ length: 6 }, (_, i) => ({
        ...mockBookings[0],
        id: `booking-${i}`,
        memberId: `member-${i}`
      }));
      
      expect(service.isBookingFull(partialBookings)).toBe(false);
      expect(service.isBookingFull(fullBookings)).toBe(true);
    });

    it('should find member booking', () => {
      const bookings = mockBookings.filter(b => b.date === '2025-10-05');
      const memberBooking = service.getMemberBooking('member1', bookings);
      const nonExistentBooking = service.getMemberBooking('nonexistent', bookings);
      
      expect(memberBooking).toBeTruthy();
      expect(memberBooking?.memberName).toBe('John Doe');
      expect(nonExistentBooking).toBeNull();
    });
  });
});

describe('Helper Functions', () => {
  let mockBookings: Booking[];

  beforeEach(() => {
    mockBookings = [
      {
        id: '1',
        memberId: 'member1',
        memberName: 'John Doe',
        date: '2025-10-05',
        isSundayBooking: true,
        timeSlot: '9:00 AM - 10:00 AM',
        timeSetBy: 'member1',
        timeSetAt: new Date('2025-10-03'),
        createdAt: new Date('2025-10-03')
      },
      {
        id: '2',
        memberId: 'member2',
        memberName: 'Jane Smith',
        date: '2025-10-05',
        isSundayBooking: true,
        timeSlot: '9:00 AM - 10:00 AM',
        timeSetBy: 'member1',
        timeSetAt: new Date('2025-10-03'),
        createdAt: new Date('2025-10-04')
      }
    ];
  });

  describe('processUpcomingSundayBookings', () => {
    it('should process upcoming Sunday bookings correctly', () => {
      const result = processUpcomingSundayBookings(mockBookings, 4);
      
      expect(result).toHaveLength(4);
      // The first result might not match our mock data since getUpcomingSundays returns actual future dates
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('processTimeSlotChange', () => {
    it('should process valid time slot change', () => {
      const request = {
        date: '2025-10-05',
        newTimeSlot: '10:00 AM - 11:00 AM',
        memberId: 'member1',
        memberName: 'John Doe'
      };
      
      const result = processTimeSlotChange(request, mockBookings);
      
      expect(result.success).toBe(true);
      expect(result.result).toBeTruthy();
      expect(result.result?.timeSlot).toBe('10:00 AM - 11:00 AM');
      expect(result.validation.isValid).toBe(true);
    });

    it('should reject invalid time slot change', () => {
      const request = {
        date: '2024-12-29', // Past date
        newTimeSlot: '10:00 AM - 11:00 AM',
        memberId: 'member1',
        memberName: 'John Doe'
      };
      
      const result = processTimeSlotChange(request, mockBookings);
      
      expect(result.success).toBe(false);
      expect(result.result).toBeUndefined();
      expect(result.validation.isValid).toBe(false);
    });
  });

  describe('processNewBooking', () => {
    it('should process valid new booking with existing time slot', () => {
      const request = {
        memberId: 'newMember',
        memberName: 'New Member',
        date: '2025-10-05'
      };
      
      const result = processNewBooking(request, mockBookings);
      
      expect(result.success).toBe(true);
      expect(result.validation.isValid).toBe(true);
      expect(result.timeSlotInfo).toBeTruthy();
      expect(result.timeSlotInfo?.timeSlot).toBe('9:00 AM - 10:00 AM');
    });

    it('should process valid new booking with new time slot', () => {
      const request = {
        memberId: 'newMember',
        memberName: 'New Member',
        date: '2025-10-19',
        timeSlot: '10:00 AM - 11:00 AM'
      };
      
      const result = processNewBooking(request, []);
      
      expect(result.success).toBe(true);
      expect(result.validation.isValid).toBe(true);
      expect(result.timeSlotInfo).toBeTruthy();
      expect(result.timeSlotInfo?.timeSlot).toBe('10:00 AM - 11:00 AM');
      expect(result.timeSlotInfo?.timeSetBy).toBe('newMember');
    });

    it('should reject invalid new booking', () => {
      const request = {
        memberId: 'member1', // Already has booking
        memberName: 'John Doe',
        date: '2025-10-05'
      };
      
      const result = processNewBooking(request, mockBookings);
      
      expect(result.success).toBe(false);
      expect(result.validation.isValid).toBe(false);
    });
  });

  describe('getSundayBookingStats', () => {
    it('should calculate booking statistics correctly', () => {
      const stats = getSundayBookingStats(mockBookings);
      
      expect(stats.totalBookings).toBe(2);
      expect(stats.uniqueDates).toBe(1);
      expect(stats.averageParticipantsPerDate).toBe(2);
      expect(stats.fullBookings).toBe(0);
      expect(stats.datesWithTimeSlots).toBe(1);
    });

    it('should handle empty bookings array', () => {
      const stats = getSundayBookingStats([]);
      
      expect(stats.totalBookings).toBe(0);
      expect(stats.uniqueDates).toBe(0);
      expect(stats.averageParticipantsPerDate).toBe(0);
      expect(stats.fullBookings).toBe(0);
      expect(stats.datesWithTimeSlots).toBe(0);
    });
  });
});