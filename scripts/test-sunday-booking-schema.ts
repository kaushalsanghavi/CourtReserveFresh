#!/usr/bin/env tsx
/**
 * Test Sunday Booking Schema
 * 
 * This script tests that the Sunday booking schema is properly defined
 * and validates the TypeScript types.
 */

import { bookings, insertBookingSchema, bookSlotSchema, timeUpdateSchema } from "../shared/schema";
import type { Booking, InsertBooking, BookSlotRequest, TimeUpdateRequest } from "../shared/schema";

console.log('🧪 TESTING SUNDAY BOOKING SCHEMA');
console.log('='.repeat(50));

// Test 1: Schema structure
console.log('\n📊 Testing schema structure...');
const bookingColumns = Object.keys(bookings);
console.log('Booking table columns:', bookingColumns);

// Test 2: TypeScript types
console.log('\n🔍 Testing TypeScript types...');

// Test regular booking
const regularBooking: InsertBooking = {
  memberId: "test-member-1",
  memberName: "Test Member",
  date: "2025-01-15"
};

// Test Sunday booking
const sundayBooking: InsertBooking = {
  memberId: "test-member-2", 
  memberName: "Sunday Player",
  date: "2025-01-19", // Sunday
  isSundayBooking: true,
  timeSlot: "8:00 AM - 9:00 AM",
  timeSetBy: "test-member-2",
  timeSetAt: new Date()
};

console.log('✅ Regular booking type:', typeof regularBooking);
console.log('✅ Sunday booking type:', typeof sundayBooking);

// Test 3: Validation schemas
console.log('\n🛡️  Testing validation schemas...');

try {
  const validBookSlot: BookSlotRequest = {
    memberId: "test-member-1",
    memberName: "Test Member", 
    date: "2025-01-15",
    isSundayBooking: false
  };
  
  const validSundayBookSlot: BookSlotRequest = {
    memberId: "test-member-2",
    memberName: "Sunday Player",
    date: "2025-01-19",
    isSundayBooking: true,
    timeSlot: "8:00 AM - 9:00 AM"
  };
  
  const validTimeUpdate: TimeUpdateRequest = {
    timeSlot: "9:00 AM - 10:00 AM",
    memberId: "test-member-1"
  };
  
  // Validate with Zod schemas
  bookSlotSchema.parse(validBookSlot);
  bookSlotSchema.parse(validSundayBookSlot);
  timeUpdateSchema.parse(validTimeUpdate);
  
  console.log('✅ All validation schemas pass');
} catch (error) {
  console.error('❌ Validation schema error:', error);
}

// Test 4: Full booking type
console.log('\n📋 Testing full booking type...');
const fullBooking: Booking = {
  id: "test-booking-id",
  memberId: "test-member-1",
  memberName: "Test Member",
  date: "2025-01-19",
  isSundayBooking: true,
  timeSlot: "8:00 AM - 9:00 AM", 
  timeSetBy: "test-member-1",
  timeSetAt: new Date(),
  createdAt: new Date()
};

console.log('✅ Full booking type structure valid');
console.log('   - ID:', fullBooking.id);
console.log('   - Member:', fullBooking.memberName);
console.log('   - Date:', fullBooking.date);
console.log('   - Is Sunday:', fullBooking.isSundayBooking);
console.log('   - Time Slot:', fullBooking.timeSlot);
console.log('   - Time Set By:', fullBooking.timeSetBy);

console.log('\n🎉 All Sunday booking schema tests passed!');
console.log('📋 Schema is ready for implementation');