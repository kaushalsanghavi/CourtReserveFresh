#!/usr/bin/env tsx
/**
 * Create True Development/Production Database Separation
 * 
 * This script creates proper environment separation by:
 * 1. Using the current database for DEVELOPMENT only
 * 2. Creating separate tables with prefixes for environment isolation
 * 3. Moving current production data to production tables
 */

import Database from '@replit/database';
import { db } from '../server/db';
import { members, bookings, activities, comments } from '../shared/schema';
import { sql } from 'drizzle-orm';

const repldb = new Database();

async function createDevProductionSeparation() {
  try {
    console.log('🔧 CREATING TRUE DEVELOPMENT/PRODUCTION SEPARATION');
    console.log('='.repeat(60));
    
    // Step 1: Get current production data from ReplDB
    console.log('\n📊 Step 1: Retrieving production data from ReplDB...');
    const prodMembers = await repldb.get('prod_members');
    const prodBookings = await repldb.get('prod_bookings');
    const prodActivities = await repldb.get('prod_activities');
    const prodComments = await repldb.get('prod_comments');
    
    console.log(`   Production data found:`);
    console.log(`   - Members: ${prodMembers?.value?.length || 0}`);
    console.log(`   - Bookings: ${prodBookings?.value?.length || 0}`);
    console.log(`   - Activities: ${prodActivities?.value?.length || 0}`);
    console.log(`   - Comments: ${prodComments?.value?.length || 0}`);
    
    // Step 2: Create production tables with different schema
    console.log('\n🏭 Step 2: Creating production schema tables...');
    
    // Create production schema
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS production`);
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS development`);
    
    // Move current tables to development schema
    console.log('   Moving current tables to development schema...');
    await db.execute(sql`ALTER TABLE IF EXISTS public.members SET SCHEMA development`);
    await db.execute(sql`ALTER TABLE IF EXISTS public.bookings SET SCHEMA development`);
    await db.execute(sql`ALTER TABLE IF EXISTS public.activities SET SCHEMA development`);
    await db.execute(sql`ALTER TABLE IF EXISTS public.comments SET SCHEMA development`);
    
    // Create production tables
    console.log('   Creating production tables...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS production.members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        avatar_color TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS production.bookings (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL,
        member_name TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (member_id) REFERENCES production.members(id)
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS production.activities (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL,
        member_name TEXT NOT NULL,
        action TEXT NOT NULL,
        date TEXT NOT NULL,
        device_info TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (member_id) REFERENCES production.members(id)
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS production.comments (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Step 3: Populate production tables with real data
    if (prodMembers?.value?.length > 0) {
      console.log('\n📝 Step 3: Populating production tables with real data...');
      
      // Insert members
      for (const member of prodMembers.value) {
        await db.execute(sql`
          INSERT INTO production.members (id, name, initials, avatar_color, created_at)
          VALUES (${member.id}, ${member.name}, ${member.initials}, ${member.avatarColor}, ${member.createdAt})
          ON CONFLICT (id) DO NOTHING
        `);
      }
      console.log(`   ✅ Inserted ${prodMembers.value.length} members`);
      
      // Insert bookings
      if (prodBookings?.value?.length > 0) {
        for (const booking of prodBookings.value) {
          await db.execute(sql`
            INSERT INTO production.bookings (id, member_id, member_name, date, created_at)
            VALUES (${booking.id}, ${booking.memberId}, ${booking.memberName}, ${booking.date}, ${booking.createdAt})
            ON CONFLICT (id) DO NOTHING
          `);
        }
        console.log(`   ✅ Inserted ${prodBookings.value.length} bookings`);
      }
      
      // Insert activities
      if (prodActivities?.value?.length > 0) {
        for (const activity of prodActivities.value) {
          await db.execute(sql`
            INSERT INTO production.activities (id, member_id, member_name, action, date, device_info, created_at)
            VALUES (${activity.id}, ${activity.memberId}, ${activity.memberName}, ${activity.action}, ${activity.date}, ${activity.deviceInfo}, ${activity.createdAt})
            ON CONFLICT (id) DO NOTHING
          `);
        }
        console.log(`   ✅ Inserted ${prodActivities.value.length} activities`);
      }
      
      // Insert comments
      if (prodComments?.value?.length > 0) {
        for (const comment of prodComments.value) {
          await db.execute(sql`
            INSERT INTO production.comments (id, date, comment, created_at)
            VALUES (${comment.id}, ${comment.date}, ${comment.comment}, ${comment.createdAt})
            ON CONFLICT (id) DO NOTHING
          `);
        }
        console.log(`   ✅ Inserted ${prodComments.value.length} comments`);
      }
    }
    
    console.log('\n🎉 DATABASE SEPARATION CREATED SUCCESSFULLY!');
    console.log('\n📋 Environment Configuration:');
    console.log('   Development: Uses development.* tables (sample data)');
    console.log('   Production: Uses production.* tables (real data)');
    console.log('\n🔄 Next Steps:');
    console.log('   1. Update database connection to use schema-based separation');
    console.log('   2. Test development environment with sample data');
    console.log('   3. Test production environment with real data');
    
  } catch (error) {
    console.error('❌ Failed to create database separation:', error);
    process.exit(1);
  }
}

createDevProductionSeparation();