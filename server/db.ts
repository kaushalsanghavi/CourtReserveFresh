import * as schema from "@shared/schema";
import dotenv from "dotenv";
import { createRequire } from "module";

// Ensure env vars are loaded even during module import order
dotenv.config({ path: ".env.local" });
dotenv.config();

const require = createRequire(import.meta.url);

// Environment detection across local, Vercel, and Replit
const isProduction =
  process.env.NODE_ENV === 'production' ||
  !!process.env.VERCEL ||
  !!process.env.REPLIT_DEPLOYMENT ||
  process.env.REPLIT_ENVIRONMENT === 'production';

// Dynamic schema detection for use in queries
export function getCurrentSchema(): string {
  const prod =
    process.env.NODE_ENV === 'production' ||
    !!process.env.REPLIT_DEPLOYMENT ||
    process.env.REPLIT_ENVIRONMENT === 'production';
  return prod ? 'production' : 'development';
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let createdPool: any;
let createdDb: any;

if (isProduction) {
  // Production: Use Neon serverless driver
  const { Pool: NeonPool, neonConfig } = require('@neondatabase/serverless');
  const { drizzle: neonDrizzle } = require('drizzle-orm/neon-serverless');
  const ws = require('ws');

  neonConfig.webSocketConstructor = ws;
  createdPool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  createdDb = neonDrizzle({ client: createdPool, schema });
} else {
  // Local development: Use regular pg driver
  const { Pool } = require('pg');
  const { drizzle } = require('drizzle-orm/node-postgres');

  createdPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${getCurrentSchema()}`,
  });
  createdDb = drizzle({ client: createdPool, schema });
}

export const pool = createdPool;
export const db = createdDb;