#!/usr/bin/env tsx
/**
 * Sunday Booking Schema Migration Script
 * 
 * This script adds the necessary columns and indexes for Sunday booking functionality
 * to the existing bookings table. It can be run safely multiple times.
 * 
 * Usage: tsx scripts/migrate-sunday-booking-schema.ts
 */

import { pool } from "../server/db";
import fs from "fs";
import path from "path";

async function migrateSundayBookingSchema() {
  console.log('🗄️  SUNDAY BOOKING SCHEMA MIGRATION');
  console.log('='.repeat(50));
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', '0001_add_sunday_booking_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📊 Applying Sunday booking schema changes...');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Successfully added Sunday booking columns:');
    console.log('   • is_sunday_booking (boolean, default false)');
    console.log('   • time_slot (text, nullable)');
    console.log('   • time_set_by (varchar, nullable)');
    console.log('   • time_set_at (timestamp, nullable)');
    
    console.log('✅ Successfully added performance indexes:');
    console.log('   • idx_bookings_sunday (is_sunday_booking, date) WHERE is_sunday_booking = true');
    console.log('   • idx_bookings_weekday (date) WHERE is_sunday_booking = false OR NULL');
    console.log('   • idx_bookings_date_member (date, member_id)');
    console.log('   • idx_bookings_time_set_by (time_set_by) WHERE NOT NULL');
    
    // Verify the changes
    console.log('\n🔍 Verifying schema changes...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name IN ('is_sunday_booking', 'time_slot', 'time_set_by', 'time_set_at')
      ORDER BY column_name;
    `);
    
    if (result.rows.length === 4) {
      console.log('✅ All Sunday booking columns verified in database schema');
      result.rows.forEach(row => {
        console.log(`   • ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`);
      });
    } else {
      console.warn(`⚠️  Expected 4 columns, found ${result.rows.length}`);
    }
    
    // Verify indexes
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'bookings' 
      AND indexname LIKE 'idx_bookings_%'
      ORDER BY indexname;
    `);
    
    console.log(`\n✅ Found ${indexResult.rows.length} performance indexes on bookings table`);
    indexResult.rows.forEach(row => {
      console.log(`   • ${row.indexname}`);
    });
    
    console.log('\n🎉 Sunday booking schema migration completed successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Update API endpoints to handle Sunday booking fields');
    console.log('   2. Implement Sunday booking business logic');
    console.log('   3. Create Sunday booking UI components');
    
  } catch (error) {
    console.error('❌ Sunday booking schema migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateSundayBookingSchema()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });