#!/usr/bin/env tsx
/**
 * Test Production Mode Database Connection
 */

// Simulate production environment
process.env.NODE_ENV = 'production';
process.env.REPLIT_DEPLOYMENT = 'true';

import { db, getCurrentSchema } from '../server/db';
import { sql } from 'drizzle-orm';

async function testProductionMode() {
  try {
    console.log('🏭 TESTING PRODUCTION MODE');
    console.log('='.repeat(40));
    console.log(`Environment: ${process.env.NODE_ENV}`);
    const schema = getCurrentSchema();
    console.log(`Schema: ${schema}`);
    
    // Test members
    const members = await db.execute(
      sql.raw(`SELECT COUNT(*) FROM ${schema}.members`)
    );
    console.log(`Members in ${schema}: ${members.rows[0][0]}`);
    
    // Test bookings
    const bookings = await db.execute(
      sql.raw(`SELECT COUNT(*) FROM ${schema}.bookings`)
    );
    console.log(`Bookings in ${schema}: ${bookings.rows[0][0]}`);
    
    // Test activities
    const activities = await db.execute(
      sql.raw(`SELECT COUNT(*) FROM ${schema}.activities`)
    );
    console.log(`Activities in ${schema}: ${activities.rows[0][0]}`);
    
    console.log('\n✅ Production mode test successful!');
    
  } catch (error) {
    console.error('❌ Production mode test failed:', error);
    process.exit(1);
  }
}

testProductionMode();