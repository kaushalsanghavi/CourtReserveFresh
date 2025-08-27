#!/usr/bin/env tsx
/**
 * Verify Production Deployment Environment Detection
 */

// Simulate actual Replit production deployment environment
process.env.REPLIT_ENVIRONMENT = 'production';
delete process.env.NODE_ENV;
delete process.env.REPLIT_DEPLOYMENT;

import { getCurrentSchema } from '../server/db';
import { DatabaseStorage } from '../server/storage';

async function verifyProductionDeployment() {
  console.log('🔍 VERIFYING PRODUCTION DEPLOYMENT');
  console.log('='.repeat(50));
  
  console.log('Environment variables:');
  console.log('REPLIT_ENVIRONMENT:', process.env.REPLIT_ENVIRONMENT);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('REPLIT_DEPLOYMENT:', process.env.REPLIT_DEPLOYMENT);
  
  console.log('\nSchema detection:');
  const schema = getCurrentSchema();
  console.log('Detected schema:', schema);
  
  if (schema !== 'production') {
    console.error('❌ FAILED: Production deployment not detecting production schema');
    process.exit(1);
  }
  
  console.log('\nTesting database access:');
  const storage = new DatabaseStorage();
  
  try {
    const members = await storage.getMembers();
    const bookings = await storage.getBookings();
    const activities = await storage.getActivities();
    
    console.log(`Members: ${members.length}`);
    console.log(`Bookings: ${bookings.length}`);
    console.log(`Activities: ${activities.length}`);
    
    if (members.length === 0) {
      console.error('❌ FAILED: No members found in production');
      process.exit(1);
    }
    
    console.log('\nSample members:');
    members.slice(0, 3).forEach(member => {
      console.log(`- ${member.name} (${member.initials})`);
    });
    
    console.log('\n✅ PRODUCTION DEPLOYMENT VERIFICATION SUCCESSFUL');
    console.log('Production environment correctly detects and accesses production data');
    
  } catch (error) {
    console.error('❌ FAILED: Database access error:', error);
    process.exit(1);
  }
}

verifyProductionDeployment();