import { describe, it, expect, beforeEach } from 'vitest';
import { 
  sundayBookingService,
  processUpcomingSundayBookings,
  processTimeSlotChange,
  processNewBooking,
  getSundayBookingStats
} from '../sunday-booking-service';
import { Booking } from '../schema';
import { getUpcomingSundays } from '../sunday-booking-utils';

describe('Sunday Booking Integration Tests', () => {
  let mockBookings: Booking[];

  beforeEach(() => {
    // Create a comprehensive set of mock bookings for integration testing
    mockBookings = [
      // Sunday 1: Full booking with time slot
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
      },
      {
        id: '3',
        memberId: 'member3',
        memberName: 'Bob Johnson',
        date: '2025-10-05',
        isSundayBooking: true,
        timeSlot: '9:00 AM - 10:00 AM',
        timeSetBy: 'member1',
        timeSetAt: new Date('2025-10-03'),
        createdAt: new Date('2025-10-04')
      },
      {
        id: '4',
        memberId: 'member4',
        memberName: 'Alice Brown',
        date: '2025-10-05',
        isSundayBooking: true,
        timeSlot: '9:00 AM - 10:00 AM',
        timeSetBy: 'member1',
        timeSetAt: new Date('2025-10-03'),
        createdAt: new Date('2025-10-04')
      },
      {
        id: '5',
        memberId: 'member5',
        memberName: 'Charlie Wilson',
        date: '2025-10-05',
        isSundayBooking: true,
        timeSlot: '9:00 AM - 10:00 AM',
        timeSetBy: 'member1',
        timeSetAt: new Date('2025-10-03'),
        createdAt: new Date('2025-10-04')
      },
      {
        id: '6',
        memberId: 'member6',
        memberName: 'Diana Davis',
        date: '2025-10-05',
        isSundayBooking: true,
        timeSlot: '9:00 AM - 10:00 AM',
        timeSetBy: 'member1',
        timeSetAt: new Date('2025-10-03'),
        createdAt: new Date('2025-10-04')
      },
      // Sunday 2: Partial booking with time slot
      {
        id: '7',
        memberId: 'member7',
        memberName: 'Eve Miller',
        date: '2025-10-12',
        isSundayBooking: true,
        timeSlot: '10:00 AM - 11:00 AM',
        timeSetBy: 'member7',
        timeSetAt: new Date('2025-10-10'),
        createdAt: new Date('2025-10-10')
      },
      {
        id: '8',
        memberId: 'member8',
        memberName: 'Frank Garcia',
        date: '2025-10-12',
        isSundayBooking: true,
        timeSlot: '10:00 AM - 11:00 AM',
        timeSetBy: 'member7',
        timeSetAt: new Date('2025-10-10'),
        createdAt: new Date('2025-10-11')
      },
      // Sunday 3: Single booking without time slot (edge case)
      {
        id: '9',
        memberId: 'member9',
        memberName: 'Grace Lee',
        date: '2025-10-19',
        isSundayBooking: true,
        timeSlot: null,
        timeSetBy: null,
        timeSetAt: null,
        createdAt: new Date('2025-10-17')
      }
    ];
  });

  describe('End-to-End Booking Flow', () => {
    it('should handle complete booking lifecycle', () => {
      // 1. Process upcoming Sunday bookings
      const upcomingBookings = processUpcomingSundayBookings(mockBookings, 4);
      expect(upcomingBookings).toHaveLength(4);
      
      // 2. Verify booking states
      const stats = getSundayBookingStats(mockBookings);
      expect(stats.totalBookings).toBe(9);
      expect(stats.uniqueDates).toBe(3);
      expect(stats.fullBookings).toBe(1); // Only 2025-10-05 is full
      expect(stats.datesWithTimeSlots).toBe(2); // 2025-10-05 and 2025-10-12 have time slots
    });

    it('should handle new booking on empty Sunday', () => {
      const emptyDate = '2025-10-26'; // Future Sunday with no bookings
      const request = {
        memberId: 'newMember',
        memberName: 'New Member',
        date: emptyDate,
        timeSlot: '11:00 AM - 12:00 PM'
      };

      const result = processNewBooking(request, []);
      
      expect(result.success).toBe(true);
      expect(result.validation.isValid).toBe(true);
      expect(result.timeSlotInfo).toBeTruthy();
      expect(result.timeSlotInfo?.timeSlot).toBe('11:00 AM - 12:00 PM');
      expect(result.timeSlotInfo?.timeSetBy).toBe('newMember');
    });

    it('should handle new booking on partially filled Sunday', () => {
      const partialBookings = mockBookings.filter(b => b.date === '2025-10-12'); // 2 bookings
      const request = {
        memberId: 'newMember',
        memberName: 'New Member',
        date: '2025-10-12'
      };

      const result = processNewBooking(request, partialBookings);
      
      expect(result.success).toBe(true);
      expect(result.validation.isValid).toBe(true);
      expect(result.timeSlotInfo).toBeTruthy();
      expect(result.timeSlotInfo?.timeSlot).toBe('10:00 AM - 11:00 AM'); // Uses existing time slot
      expect(result.timeSlotInfo?.timeSetBy).toBe('member7'); // Original time setter
    });

    it('should reject new booking on full Sunday', () => {
      const fullBookings = mockBookings.filter(b => b.date === '2025-10-05'); // 6 bookings
      const request = {
        memberId: 'newMember',
        memberName: 'New Member',
        date: '2025-10-05'
      };

      const result = processNewBooking(request, fullBookings);
      
      expect(result.success).toBe(false);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors).toContain('This Sunday is fully booked (6/6 slots)');
    });

    it('should reject duplicate booking for same member', () => {
      const existingBookings = mockBookings.filter(b => b.date === '2025-10-12');
      const request = {
        memberId: 'member7', // Already has booking on this date
        memberName: 'Eve Miller',
        date: '2025-10-12'
      };

      const result = processNewBooking(request, existingBookings);
      
      expect(result.success).toBe(false);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors).toContain('Member already has a booking for this Sunday');
    });
  });

  describe('Time Slot Management Flow', () => {
    it('should handle time slot change on existing booking', () => {
      const existingBookings = mockBookings.filter(b => b.date === '2025-10-12');
      const changeRequest = {
        date: '2025-10-12',
        newTimeSlot: '2:00 PM - 3:00 PM',
        memberId: 'member8',
        memberName: 'Frank Garcia'
      };

      const result = processTimeSlotChange(changeRequest, existingBookings);
      
      expect(result.success).toBe(true);
      expect(result.validation.isValid).toBe(true);
      expect(result.result).toBeTruthy();
      expect(result.result?.timeSlot).toBe('2:00 PM - 3:00 PM');
      expect(result.result?.participants).toHaveLength(2);
    });

    it('should provide warnings for time slot changes', () => {
      const existingBookings = mockBookings.filter(b => b.date === '2025-10-05');
      const changeRequest = {
        date: '2025-10-05',
        newTimeSlot: '3:00 PM - 4:00 PM',
        memberId: 'member1',
        memberName: 'John Doe'
      };

      const result = processTimeSlotChange(changeRequest, existingBookings);
      
      expect(result.success).toBe(true);
      expect(result.validation.warnings).toHaveLength(1);
      expect(result.validation.warnings?.[0]).toContain('All existing bookings for this date will be updated');
    });

    it('should reject time slot change with invalid format', () => {
      const existingBookings = mockBookings.filter(b => b.date === '2025-10-12');
      const changeRequest = {
        date: '2025-10-12',
        newTimeSlot: 'invalid-time-format',
        memberId: 'member8',
        memberName: 'Frank Garcia'
      };

      const result = processTimeSlotChange(changeRequest, existingBookings);
      
      expect(result.success).toBe(false);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors).toContain("Time slot must be in format 'HH:MM AM/PM - HH:MM AM/PM'");
    });
  });

  describe('Capacity Management', () => {
    it('should correctly calculate available spots', () => {
      const fullBookings = mockBookings.filter(b => b.date === '2025-10-05');
      const partialBookings = mockBookings.filter(b => b.date === '2025-10-12');
      const emptyBookings: Booking[] = [];

      expect(sundayBookingService.getAvailableSpots(fullBookings)).toBe(0);
      expect(sundayBookingService.getAvailableSpots(partialBookings)).toBe(4);
      expect(sundayBookingService.getAvailableSpots(emptyBookings)).toBe(6);
    });

    it('should correctly identify full bookings', () => {
      const fullBookings = mockBookings.filter(b => b.date === '2025-10-05');
      const partialBookings = mockBookings.filter(b => b.date === '2025-10-12');

      expect(sundayBookingService.isBookingFull(fullBookings)).toBe(true);
      expect(sundayBookingService.isBookingFull(partialBookings)).toBe(false);
    });

    it('should validate capacity constraints', () => {
      const fullBookings = mockBookings.filter(b => b.date === '2025-10-05');
      const partialBookings = mockBookings.filter(b => b.date === '2025-10-12');

      const fullValidation = sundayBookingService.validateBookingCapacity('2025-10-05', fullBookings);
      const partialValidation = sundayBookingService.validateBookingCapacity('2025-10-12', partialBookings);

      expect(fullValidation.isValid).toBe(false);
      expect(fullValidation.errors).toContain('This Sunday is fully booked (6/6 slots)');
      
      expect(partialValidation.isValid).toBe(true);
      expect(partialValidation.errors).toHaveLength(0);
    });
  });

  describe('Data Grouping and Transformation', () => {
    it('should group bookings by date correctly', () => {
      const grouped = sundayBookingService.groupBookingsByDate(mockBookings);
      
      expect(Object.keys(grouped)).toHaveLength(3);
      expect(grouped['2025-10-05']).toHaveLength(6);
      expect(grouped['2025-10-12']).toHaveLength(2);
      expect(grouped['2025-10-19']).toHaveLength(1);
    });

    it('should create booking groups with correct metadata', () => {
      const dates = ['2025-10-05', '2025-10-12', '2025-10-19', '2025-10-26'];
      const groups = sundayBookingService.createBookingGroups(dates, mockBookings);
      
      expect(groups).toHaveLength(4);
      
      // Full booking
      expect(groups[0].date).toBe('2025-10-05');
      expect(groups[0].participants).toHaveLength(6);
      expect(groups[0].availableSpots).toBe(0);
      expect(groups[0].timeSlot).toBe('9:00 AM - 10:00 AM');
      
      // Partial booking
      expect(groups[1].date).toBe('2025-10-12');
      expect(groups[1].participants).toHaveLength(2);
      expect(groups[1].availableSpots).toBe(4);
      expect(groups[1].timeSlot).toBe('10:00 AM - 11:00 AM');
      
      // Single booking without time slot
      expect(groups[2].date).toBe('2025-10-19');
      expect(groups[2].participants).toHaveLength(1);
      expect(groups[2].availableSpots).toBe(5);
      expect(groups[2].timeSlot).toBeNull();
      
      // Empty booking
      expect(groups[3].date).toBe('2025-10-26');
      expect(groups[3].participants).toHaveLength(0);
      expect(groups[3].availableSpots).toBe(6);
      expect(groups[3].timeSlot).toBeNull();
    });

    it('should transform to API response format correctly', () => {
      const dates = ['2025-10-05', '2025-10-12'];
      const groups = sundayBookingService.createBookingGroups(dates, mockBookings);
      const responses = sundayBookingService.transformToApiResponse(groups);
      
      expect(responses).toHaveLength(2);
      
      // Check full booking response
      expect(responses[0].date).toBe('2025-10-05');
      expect(responses[0].participants).toHaveLength(6);
      expect(responses[0].availableSpots).toBe(0);
      expect(responses[0].timeSlot).toBe('9:00 AM - 10:00 AM');
      expect(responses[0].timeSetBy).toBe('member1');
      
      // Check partial booking response
      expect(responses[1].date).toBe('2025-10-12');
      expect(responses[1].participants).toHaveLength(2);
      expect(responses[1].availableSpots).toBe(4);
      expect(responses[1].timeSlot).toBe('10:00 AM - 11:00 AM');
      expect(responses[1].timeSetBy).toBe('member7');
      
      // Verify participant data structure
      expect(responses[0].participants[0]).toHaveProperty('memberId');
      expect(responses[0].participants[0]).toHaveProperty('memberName');
      expect(responses[0].participants[0]).toHaveProperty('joinedAt');
    });
  });

  describe('Statistics and Analytics', () => {
    it('should calculate comprehensive booking statistics', () => {
      const stats = getSundayBookingStats(mockBookings);
      
      expect(stats.totalBookings).toBe(9);
      expect(stats.uniqueDates).toBe(3);
      expect(stats.averageParticipantsPerDate).toBe(3); // 9 bookings / 3 dates
      expect(stats.fullBookings).toBe(1); // Only 2025-10-05
      expect(stats.datesWithTimeSlots).toBe(2); // 2025-10-05 and 2025-10-12
    });

    it('should handle edge cases in statistics', () => {
      const emptyStats = getSundayBookingStats([]);
      expect(emptyStats.totalBookings).toBe(0);
      expect(emptyStats.uniqueDates).toBe(0);
      expect(emptyStats.averageParticipantsPerDate).toBe(0);
      expect(emptyStats.fullBookings).toBe(0);
      expect(emptyStats.datesWithTimeSlots).toBe(0);
      
      const singleBookingStats = getSundayBookingStats([mockBookings[0]]);
      expect(singleBookingStats.totalBookings).toBe(1);
      expect(singleBookingStats.uniqueDates).toBe(1);
      expect(singleBookingStats.averageParticipantsPerDate).toBe(1);
      expect(singleBookingStats.fullBookings).toBe(0);
      expect(singleBookingStats.datesWithTimeSlots).toBe(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle bookings with inconsistent time slot data', () => {
      const inconsistentBookings: Booking[] = [
        {
          ...mockBookings[0],
          date: '2025-11-02',
          timeSlot: '9:00 AM - 10:00 AM'
        },
        {
          ...mockBookings[1],
          date: '2025-11-02',
          timeSlot: '10:00 AM - 11:00 AM' // Different time slot (shouldn't happen in real data)
        }
      ];

      const groups = sundayBookingService.createBookingGroups(['2025-11-02'], inconsistentBookings);
      
      // Should use the first booking's time slot
      expect(groups[0].timeSlot).toBe('9:00 AM - 10:00 AM');
      expect(groups[0].participants).toHaveLength(2);
    });

    it('should handle mixed Sunday and non-Sunday bookings', () => {
      const mixedBookings: Booking[] = [
        ...mockBookings,
        {
          id: 'weekday1',
          memberId: 'member10',
          memberName: 'Weekday Member',
          date: '2025-10-06', // Monday
          isSundayBooking: false,
          timeSlot: null,
          timeSetBy: null,
          timeSetAt: null,
          createdAt: new Date('2025-10-05')
        }
      ];

      const grouped = sundayBookingService.groupBookingsByDate(mixedBookings);
      
      // Should only include Sunday bookings
      expect(Object.keys(grouped)).toHaveLength(3);
      expect(grouped['2025-10-06']).toBeUndefined();
    });

    it('should validate business rules consistently', () => {
      // Test various validation scenarios
      const scenarios = [
        {
          name: 'Past Sunday',
          memberId: 'member1',
          date: '2024-12-29',
          timeSlot: '9:00 AM - 10:00 AM',
          expectedValid: false,
          expectedError: 'Cannot book slots for past dates'
        },
        {
          name: 'Non-Sunday date',
          memberId: 'member1',
          date: '2025-10-06',
          timeSlot: '9:00 AM - 10:00 AM',
          expectedValid: false,
          expectedError: 'This booking type is only available for Sundays'
        },
        {
          name: 'Invalid time slot format',
          memberId: 'member1',
          date: '2025-10-26',
          timeSlot: '9-10 AM',
          expectedValid: false,
          expectedError: 'Time slot must be in format'
        },
        {
          name: 'Valid future Sunday',
          memberId: 'member1',
          date: '2025-10-26',
          timeSlot: '9:00 AM - 10:00 AM',
          expectedValid: true,
          expectedError: null
        }
      ];

      scenarios.forEach(scenario => {
        const result = sundayBookingService.validateNewBooking(
          scenario.memberId,
          scenario.date,
          [],
          scenario.timeSlot
        );

        expect(result.isValid).toBe(scenario.expectedValid);
        if (scenario.expectedError) {
          expect(result.errors.some(error => error.includes(scenario.expectedError!))).toBe(true);
        }
      });
    });
  });
});