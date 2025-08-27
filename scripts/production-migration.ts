/**
 * Production Migration Script
 * This script should ONLY be run during production deployment
 * It migrates ReplDB data to the production PostgreSQL database
 * 
 * Usage: NODE_ENV=production tsx scripts/production-migration.ts
 */

import Database from "@replit/database";
import { db } from "../server/db";
import { members, bookings, activities, comments } from "../shared/schema";
import type { Member, Booking, Activity, Comment } from "../shared/schema";

// Safety check - only run in production
if (process.env.NODE_ENV !== 'production') {
  console.error('❌ This script can only be run in production environment');
  console.error('   Use: NODE_ENV=production tsx scripts/production-migration.ts');
  process.exit(1);
}

const replDB = new Database();

async function migrateProductionData() {
  console.log('🚀 Starting PRODUCTION ReplDB to PostgreSQL migration...');
  console.log('⚠️  This will migrate your real data to production PostgreSQL');
  
  try {
    // 1. Migrate Members
    console.log('📋 Migrating members...');
    const replMembers = await replDB.get("members");
    let memberData: Member[] = [];
    
    if (replMembers && Array.isArray(replMembers)) {
      memberData = replMembers;
    } else if (replMembers && typeof replMembers === 'object' && 'value' in replMembers) {
      memberData = replMembers.value;
    }
    
    if (memberData.length > 0) {
      // Clear existing sample data in production PostgreSQL
      await db.delete(members);
      
      // Insert real members with original IDs and timestamps
      for (const member of memberData) {
        await db.insert(members).values({
          id: member.id,
          name: member.name,
          initials: member.initials,
          avatarColor: member.avatarColor,
          createdAt: new Date(member.createdAt)
        });
      }
      console.log(`✅ Migrated ${memberData.length} members to production`);
    }
    
    // 2. Migrate Bookings
    console.log('📅 Migrating bookings...');
    const replBookings = await replDB.get("bookings");
    let bookingData: Booking[] = [];
    
    if (replBookings && Array.isArray(replBookings)) {
      bookingData = replBookings;
    } else if (replBookings && typeof replBookings === 'object' && 'value' in replBookings) {
      bookingData = replBookings.value;
    }
    
    if (bookingData.length > 0) {
      await db.delete(bookings);
      
      for (const booking of bookingData) {
        await db.insert(bookings).values({
          id: booking.id,
          memberId: booking.memberId,
          memberName: booking.memberName,
          date: booking.date,
          createdAt: new Date(booking.createdAt)
        });
      }
      console.log(`✅ Migrated ${bookingData.length} bookings to production`);
    }
    
    // 3. Migrate Activities
    console.log('🎯 Migrating activities...');
    const replActivities = await replDB.get("activities");
    let activityData: Activity[] = [];
    
    if (replActivities && Array.isArray(replActivities)) {
      activityData = replActivities;
    } else if (replActivities && typeof replActivities === 'object' && 'value' in replActivities) {
      activityData = replActivities.value;
    }
    
    if (activityData.length > 0) {
      await db.delete(activities);
      
      for (const activity of activityData) {
        await db.insert(activities).values({
          id: activity.id,
          memberId: activity.memberId,
          memberName: activity.memberName,
          action: activity.action,
          date: activity.date,
          deviceInfo: activity.deviceInfo,
          createdAt: new Date(activity.createdAt)
        });
      }
      console.log(`✅ Migrated ${activityData.length} activities to production`);
    }
    
    // 4. Migrate Comments
    console.log('💬 Migrating comments...');
    const replComments = await replDB.get("comments");
    let commentData: Comment[] = [];
    
    if (replComments && Array.isArray(replComments)) {
      commentData = replComments;
    } else if (replComments && typeof replComments === 'object' && 'value' in replComments) {
      commentData = replComments.value;
    }
    
    if (commentData.length > 0) {
      await db.delete(comments);
      
      for (const comment of commentData) {
        await db.insert(comments).values({
          id: comment.id,
          memberId: comment.memberId,
          memberName: comment.memberName,
          date: comment.date,
          comment: comment.comment,
          createdAt: new Date(comment.createdAt)
        });
      }
      console.log(`✅ Migrated ${commentData.length} comments to production`);
    }
    
    console.log('🎉 PRODUCTION migration completed successfully!');
    console.log('📊 Production Data Summary:');
    console.log(`   - Members: ${memberData.length}`);
    console.log(`   - Bookings: ${bookingData.length}`);
    console.log(`   - Activities: ${activityData.length}`);
    console.log(`   - Comments: ${commentData.length}`);
    console.log('');
    console.log('🚀 Your production PostgreSQL database now contains your real data!');
    console.log('📁 ReplDB data remains as backup');
    
  } catch (error) {
    console.error('❌ Production migration failed:', error);
    throw error;
  }
}

// Run production migration
migrateProductionData()
  .then(() => {
    console.log('✅ Production migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Production migration script failed:', error);
    process.exit(1);
  });