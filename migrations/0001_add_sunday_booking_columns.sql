-- Migration: Add Sunday booking columns to existing bookings table
-- This migration adds the necessary columns for Sunday booking functionality

-- Add new columns for Sunday bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_sunday_booking boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS time_slot text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS time_set_by varchar;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS time_set_at timestamp;

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_bookings_sunday ON bookings(is_sunday_booking, date) WHERE is_sunday_booking = true;
CREATE INDEX IF NOT EXISTS idx_bookings_weekday ON bookings(date) WHERE is_sunday_booking = false OR is_sunday_booking IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_date_member ON bookings(date, member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_set_by ON bookings(time_set_by) WHERE time_set_by IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN bookings.is_sunday_booking IS 'Flag to identify Sunday bookings vs weekday bookings';
COMMENT ON COLUMN bookings.time_slot IS 'Time slot for Sunday bookings (e.g., "8:00 AM - 9:00 AM")';
COMMENT ON COLUMN bookings.time_set_by IS 'Member ID who set the time slot for Sunday booking';
COMMENT ON COLUMN bookings.time_set_at IS 'Timestamp when the time slot was set';