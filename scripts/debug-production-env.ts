#!/usr/bin/env tsx
/**
 * Debug Production Environment Detection
 */

console.log('=== ENVIRONMENT DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REPLIT_DEPLOYMENT:', process.env.REPLIT_DEPLOYMENT);
console.log('All environment variables containing "NODE" or "REPLIT":');

Object.keys(process.env)
  .filter(key => key.includes('NODE') || key.includes('REPLIT'))
  .sort()
  .forEach(key => {
    console.log(`${key}: ${process.env[key]}`);
  });

// Test the logic (updated)
const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT || process.env.REPLIT_ENVIRONMENT === 'production';
console.log('\nProduction detection result:', isProduction);
console.log('Expected schema:', isProduction ? 'production' : 'development');