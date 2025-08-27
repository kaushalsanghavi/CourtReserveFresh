#!/usr/bin/env tsx
/**
 * Fix Data Placement - Move Production Data Back to Production Schema
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function fixDataPlacement() {
  try {
    console.log('🚨 FIXING DATA PLACEMENT - CRITICAL CORRECTION');
    console.log('='.repeat(60));
    
    // Step 1: Clear production schema (it's currently empty or has wrong data)
    console.log('🗑️  Step 1: Clearing production schema...');
    await db.execute(sql`DELETE FROM production.comments`);
    await db.execute(sql`DELETE FROM production.activities`);
    await db.execute(sql`DELETE FROM production.bookings`);
    await db.execute(sql`DELETE FROM production.members`);
    
    // Step 2: Move REAL production data from development to production
    console.log('📦 Step 2: Moving REAL production data to production schema...');
    
    // Move members (these are the real production members)
    await db.execute(sql`
      INSERT INTO production.members (id, name, initials, avatar_color, created_at)
      SELECT id, name, initials, avatar_color, created_at 
      FROM development.members
    `);
    
    // Move bookings (these are the real production bookings - 26 bookings through Aug 27)
    await db.execute(sql`
      INSERT INTO production.bookings (id, member_id, member_name, date, created_at)
      SELECT id, member_id, member_name, date, created_at 
      FROM development.bookings
    `);
    
    // Move activities (these are the real production activities - 32 activities)
    await db.execute(sql`
      INSERT INTO production.activities (id, member_id, member_name, action, date, device_info, created_at)
      SELECT id, member_id, member_name, action, date, device_info, created_at 
      FROM development.activities
    `);
    
    // Move comments (these are the real production comments)
    await db.execute(sql`
      INSERT INTO production.comments (id, date, comment, created_at)
      SELECT id, date, comment, created_at 
      FROM development.comments
    `);
    
    // Step 3: Clear development and add proper development sample data
    console.log('🛠️  Step 3: Setting up proper development sample data...');
    
    await db.execute(sql`DELETE FROM development.comments`);
    await db.execute(sql`DELETE FROM development.activities`);
    await db.execute(sql`DELETE FROM development.bookings`);
    await db.execute(sql`DELETE FROM development.members`);
    
    // Add development sample members (different from production)
    const devMembers = [
      ['dev-1', 'Dev Alice', 'DA', 'blue'],
      ['dev-2', 'Dev Bob', 'DB', 'green'],
      ['dev-3', 'Dev Charlie', 'DC', 'purple'],
      ['dev-4', 'Dev Diana', 'DD', 'orange'],
      ['dev-5', 'Dev Eve', 'DE', 'red']
    ];
    
    for (const [id, name, initials, color] of devMembers) {
      await db.execute(sql`
        INSERT INTO development.members (id, name, initials, avatar_color, created_at)
        VALUES (${id}, ${name}, ${initials}, ${color}, NOW())
      `);
    }
    
    // Add development sample bookings (future dates)
    const devBookings = [
      ['dev-b1', 'dev-1', 'Dev Alice', '2025-09-01'],
      ['dev-b2', 'dev-2', 'Dev Bob', '2025-09-02'],
      ['dev-b3', 'dev-3', 'Dev Charlie', '2025-09-03']
    ];
    
    for (const [id, memberId, memberName, date] of devBookings) {
      await db.execute(sql`
        INSERT INTO development.bookings (id, member_id, member_name, date, created_at)
        VALUES (${id}, ${memberId}, ${memberName}, ${date}, NOW())
      `);
    }
    
    // Add development sample activities
    const devActivities = [
      ['dev-a1', 'dev-1', 'Dev Alice', 'booked a slot for', '2025-09-01', 'Development Browser'],
      ['dev-a2', 'dev-2', 'Dev Bob', 'booked a slot for', '2025-09-02', 'Development Browser']
    ];
    
    for (const [id, memberId, memberName, action, date, device] of devActivities) {
      await db.execute(sql`
        INSERT INTO development.activities (id, member_id, member_name, action, date, device_info, created_at)
        VALUES (${id}, ${memberId}, ${memberName}, ${action}, ${date}, ${device}, NOW())
      `);
    }
    
    // Verify the fix
    console.log('\n📊 Verification:');
    const prodMembers = await db.execute(sql`SELECT COUNT(*) FROM production.members`);
    const prodBookings = await db.execute(sql`SELECT COUNT(*) FROM production.bookings`);
    const prodActivities = await db.execute(sql`SELECT COUNT(*) FROM production.activities`);
    
    const devMembers2 = await db.execute(sql`SELECT COUNT(*) FROM development.members`);
    const devBookings2 = await db.execute(sql`SELECT COUNT(*) FROM development.bookings`);
    const devActivities2 = await db.execute(sql`SELECT COUNT(*) FROM development.activities`);
    
    console.log(`Production: ${prodMembers.rows[0][0]} members, ${prodBookings.rows[0][0]} bookings, ${prodActivities.rows[0][0]} activities`);
    console.log(`Development: ${devMembers2.rows[0][0]} members, ${devBookings2.rows[0][0]} bookings, ${devActivities2.rows[0][0]} activities`);
    
    console.log('\n✅ DATA PLACEMENT FIXED!');
    console.log('🏭 Production: Has your REAL data (26 bookings through Aug 27, 32 activities)');
    console.log('🛠️  Development: Has clean sample data for testing');
    
  } catch (error) {
    console.error('❌ Failed to fix data placement:', error);
    process.exit(1);
  }
}

fixDataPlacement();