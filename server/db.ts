import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Environment-aware database connection
function getDatabaseUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT;
  
  // Check for production-specific database URL
  if (isProduction && process.env.PROD_DATABASE_URL) {
    console.log('🏭 Using production database:', process.env.PROD_DATABASE_URL.substring(0, 30) + '...');
    return process.env.PROD_DATABASE_URL;
  }
  
  // Check for development-specific database URL
  if (!isProduction && process.env.DEV_DATABASE_URL) {
    console.log('🛠️  Using development database:', process.env.DEV_DATABASE_URL.substring(0, 30) + '...');
    return process.env.DEV_DATABASE_URL;
  }
  
  // Fallback to default DATABASE_URL (current behavior)
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  
  console.log(`🗄️  Using ${isProduction ? 'production' : 'development'} database (shared):`, 
    process.env.DATABASE_URL.substring(0, 30) + '...');
  return process.env.DATABASE_URL;
}

const databaseUrl = getDatabaseUrl();
export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });