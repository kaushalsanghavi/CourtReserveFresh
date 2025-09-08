import * as schema from "@shared/schema";

// Use different drivers for local vs production
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;

let db: any;
let pool: any;

if (isProduction) {
  // Production: Use Neon serverless driver
  const { Pool: NeonPool, neonConfig } = require('@neondatabase/serverless');
  const { drizzle: neonDrizzle } = require('drizzle-orm/neon-serverless');
  const ws = require('ws');
  
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = neonDrizzle({ client: pool, schema });
} else {
  // Local development: Use regular pg driver
  const { Pool } = require('pg');
  const { drizzle } = require('drizzle-orm/node-postgres');
  
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${getCurrentSchema()}`
  });
  db = drizzle({ client: pool, schema });
}

// Environment-aware database connection with schema separation
function getDatabaseConfig() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT || process.env.REPLIT_ENVIRONMENT === 'production';
  
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  
  const schemaName = isProduction ? 'production' : 'development';
  console.log(`🗄️  Using ${schemaName} schema on database:`, 
    process.env.DATABASE_URL.substring(0, 30) + '...');
  
  return {
    connectionString: process.env.DATABASE_URL,
    schema: schemaName
  };
}

const config = getDatabaseConfig();
export const pool = new Pool({ 
  connectionString: config.connectionString,
  // Set the search_path to use the correct schema
  options: `-c search_path=${config.schema}`
});
export const db = drizzle({ client: pool, schema });

// Dynamic schema detection for use in queries
export function getCurrentSchema(): string {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT || process.env.REPLIT_ENVIRONMENT === 'production';
  return isProduction ? 'production' : 'development';
}