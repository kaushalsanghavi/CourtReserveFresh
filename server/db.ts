import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Environment-aware database connection with schema separation
function getDatabaseConfig() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT;
  
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  
  const schema = isProduction ? 'production' : 'development';
  console.log(`🗄️  Using ${schema} schema on database:`, 
    process.env.DATABASE_URL.substring(0, 30) + '...');
  
  return {
    connectionString: process.env.DATABASE_URL,
    schema: schema
  };
}

const config = getDatabaseConfig();
export const pool = new Pool({ connectionString: config.connectionString });
export const db = drizzle({ client: pool, schema });

// Dynamic schema detection for use in queries
export function getCurrentSchema(): string {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT;
  return isProduction ? 'production' : 'development';
}