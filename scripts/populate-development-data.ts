#!/usr/bin/env tsx
/**
 * Populate Development Schema with Sample Data
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function populateDevelopmentData() {
  try {
    console.log('🛠️  POPULATING DEVELOPMENT SCHEMA WITH SAMPLE DATA');
    console.log('='.repeat(50));
    
    // Check if data already exists
    const existingMembers = await db.execute(
      sql.raw(`SELECT COUNT(*) FROM development.members`)
    );
    
    if (existingMembers.rows[0][0] > 0) {
      console.log('✅ Development data already exists');
      return;
    }
    
    // Insert members
    console.log('👥 Creating members...');
    const members = [
      ['185ba121-361a-4410-a6b8-bf8c0b8d5ec8', 'Ashish', 'A', 'green'],
      ['b0d98c0c-f9df-4424-80e0-69e7771adf78', 'Gagan', 'G', 'blue'],
      ['44cbcab6-184a-4850-8f47-2c9a8abb4144', 'He-man', 'H', 'purple'],
      ['d48a1ba2-db24-460e-9898-4181128746a3', 'Kaushal', 'K', 'yellow'],
      ['f8256294-c360-4330-8187-9e0f97ee92fe', 'Main hoon na', 'MH', 'pink'],
      ['23c19d66-7640-4b3b-a90a-64ac004f4240', 'Aswini', 'AS', 'indigo'],
      ['1da2fbce-f542-4f3e-996f-6b0c4e1d2640', 'Rahul', 'R', 'orange'],
      ['05da5d42-eb70-4c2c-86f3-e78c1d349d7d', 'RK', 'RK', 'red'],
      ['65832075-2c16-4364-a0dd-3943d4e3a7c3', 'Anjali', 'AN', 'teal'],
      ['fc395f20-2d7e-4d87-9fc8-1ddf702e5800', 'Kumar', 'KU', 'cyan']
    ];
    
    for (const [id, name, initials, color] of members) {
      await db.execute(
        sql.raw(`INSERT INTO development.members (id, name, initials, avatar_color, created_at) 
                VALUES ('${id}', '${name}', '${initials}', '${color}', NOW())`)
      );
    }
    
    // Insert sample bookings
    console.log('📅 Creating sample bookings...');
    const bookings = [
      ['b1', 'b0d98c0c-f9df-4424-80e0-69e7771adf78', 'Gagan', '2025-08-30'],
      ['b2', '44cbcab6-184a-4850-8f47-2c9a8abb4144', 'He-man', '2025-08-30'],
      ['b3', 'd48a1ba2-db24-460e-9898-4181128746a3', 'Kaushal', '2025-08-31'],
      ['b4', '1da2fbce-f542-4f3e-996f-6b0c4e1d2640', 'Rahul', '2025-09-01'],
      ['b5', '65832075-2c16-4364-a0dd-3943d4e3a7c3', 'Anjali', '2025-09-02']
    ];
    
    for (const [id, memberId, memberName, date] of bookings) {
      await db.execute(
        sql.raw(`INSERT INTO development.bookings (id, member_id, member_name, date, created_at) 
                VALUES ('${id}', '${memberId}', '${memberName}', '${date}', NOW())`)
      );
    }
    
    // Insert sample activities
    console.log('🎯 Creating sample activities...');
    const activities = [
      ['a1', 'b0d98c0c-f9df-4424-80e0-69e7771adf78', 'Gagan', 'booked a slot for', '2025-08-30', 'Development Device'],
      ['a2', '44cbcab6-184a-4850-8f47-2c9a8abb4144', 'He-man', 'booked a slot for', '2025-08-30', 'Development Device'],
      ['a3', 'd48a1ba2-db24-460e-9898-4181128746a3', 'Kaushal', 'booked a slot for', '2025-08-31', 'Development Device']
    ];
    
    for (const [id, memberId, memberName, action, date, device] of activities) {
      await db.execute(
        sql.raw(`INSERT INTO development.activities (id, member_id, member_name, action, date, device_info, created_at) 
                VALUES ('${id}', '${memberId}', '${memberName}', '${action}', '${date}', '${device}', NOW())`)
      );
    }
    
    // Insert sample comments
    console.log('💬 Creating sample comments...');
    const comments = [
      ['c1', '2025-08-30', 'Great session today! Court 1 needs net adjustment.'],
      ['c2', '2025-08-31', 'Weather looks good for tomorrow. See everyone there!']
    ];
    
    for (const [id, date, comment] of comments) {
      await db.execute(
        sql.raw(`INSERT INTO development.comments (id, date, comment, created_at) 
                VALUES ('${id}', '${date}', '${comment}', NOW())`)
      );
    }
    
    console.log('✅ Development data populated successfully!');
    console.log(`   Members: ${members.length}`);
    console.log(`   Bookings: ${bookings.length}`);
    console.log(`   Activities: ${activities.length}`);
    console.log(`   Comments: ${comments.length}`);
    
  } catch (error) {
    console.error('❌ Failed to populate development data:', error);
    process.exit(1);
  }
}

populateDevelopmentData();