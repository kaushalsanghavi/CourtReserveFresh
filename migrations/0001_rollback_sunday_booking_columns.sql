-- Rollback Migration: Remove Sunday booking columns from bookings table
-- This migration removes the Sunday booking functionality columns

-- Drop indexes first
DROP INDEX IF EXISTS idx_bookings_sunday;
DROP INDEX IF EXISTS idx_bookings_weekday;
DROP INDEX IF EXISTS idx_bookings_date_member;
DROP INDEX IF EXISTS idx_bookings_time_set_by;

-- Remove columns
ALTER TABLE bookings DROP COLUMN IF EXISTS is_sunday_booking;
ALTER TABLE bookings DROP COLUMN IF EXISTS time_slot;
ALTER TABLE bookings DROP COLUMN IF EXISTS time_set_by;
ALTER TABLE bookings DROP COLUMN IF EXISTS time_set_at;