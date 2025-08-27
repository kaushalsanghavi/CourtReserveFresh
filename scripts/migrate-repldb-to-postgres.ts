/**
 * Migration script to transfer data from ReplDB to PostgreSQL
 * Run this script when ready to migrate production data
 * 
 * Usage: tsx scripts/migrate-repldb-to-postgres.ts
 */

import Database from "@replit/database";
import { db } from "../server/db";
import { members, bookings, activities, comments } from "../shared/schema";
import type { Member, Booking, Activity, Comment } from "../shared/schema";

const replDB = new Database();

async function migrateData() {
  console.log('🚀 Starting ReplDB to PostgreSQL migration...');
  
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
      // Clear existing members in PostgreSQL
      await db.delete(members);
      
      // Insert members with original IDs and timestamps
      for (const member of memberData) {
        await db.insert(members).values({
          id: member.id,
          name: member.name,
          initials: member.initials,
          avatarColor: member.avatarColor,
          createdAt: new Date(member.createdAt)
        });
      }
      console.log(`✅ Migrated ${memberData.length} members`);
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
      console.log(`✅ Migrated ${bookingData.length} bookings`);
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
      console.log(`✅ Migrated ${activityData.length} activities`);
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
      console.log(`✅ Migrated ${commentData.length} comments`);
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Members: ${memberData.length}`);
    console.log(`   - Bookings: ${bookingData.length}`);
    console.log(`   - Activities: ${activityData.length}`);
    console.log(`   - Comments: ${commentData.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });