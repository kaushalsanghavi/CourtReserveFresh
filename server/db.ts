import * as schema from "../shared/schema.js";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { Pool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";

// Ensure env vars are loaded even during module import order
dotenv.config({ path: ".env.local" });
dotenv.config();

// Environment detection across local, Vercel, and Replit
const isProduction =
  process.env.NODE_ENV === 'production' ||
  !!process.env.VERCEL ||
  !!process.env.REPLIT_DEPLOYMENT ||
  process.env.REPLIT_ENVIRONMENT === 'production';

// Dynamic schema detection for use in queries
export function getCurrentSchema(): string {
  // Allow overriding explicitly
  if (process.env.DATABASE_SCHEMA && process.env.DATABASE_SCHEMA.trim().length > 0) {
    return process.env.DATABASE_SCHEMA.trim();
  }

  const prod =
    process.env.NODE_ENV === 'production' ||
    !!process.env.REPLIT_DEPLOYMENT ||
    process.env.REPLIT_ENVIRONMENT === 'production' ||
    !!process.env.VERCEL;

  // On Vercel/Neon use 'public' as the default schema
  return prod ? 'public' : 'development';
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let createdPool: any;
let createdDb: any;

if (isProduction) {
  // Production: Use Neon HTTP driver (stable in serverless runtimes)
  createdPool = neon(process.env.DATABASE_URL);
  createdDb = drizzleNeon(createdPool, { schema });
} else {
  // Local development: Use regular pg driver
  createdPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${getCurrentSchema()}`,
  });
  createdDb = drizzlePg({ client: createdPool, schema });
}

export const pool = createdPool;
export const db = createdDb;

function maskDatabaseUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const hasCredentials = parsed.username.length > 0 || parsed.password.length > 0;
    const credentialsPart = hasCredentials ? "***@" : "";
    return `${parsed.protocol}//${credentialsPart}${parsed.host}${parsed.pathname}`;
  } catch {
    return "<unparseable>";
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function logDatabaseStartupHealth(): Promise<void> {
  const schemaName = getCurrentSchema();
  const dbUrl = process.env.DATABASE_URL ?? "";

  console.info(
    "[db_startup_health]",
    JSON.stringify({
      stage: "init",
      schema: schemaName,
      isProduction,
      databaseUrl: maskDatabaseUrl(dbUrl),
    }),
  );

  const startedAt = Date.now();
  try {
    const result = (await withTimeout(
      db.execute(
        sql.raw(
          "select current_database() as database_name, current_user as database_user, current_schema() as current_schema",
        ),
      ),
      2000,
    )) as { rows?: Array<Record<string, unknown>> };

    const row = Array.isArray(result.rows) ? result.rows[0] : undefined;
    console.info(
      "[db_startup_health]",
      JSON.stringify({
        stage: "ping_ok",
        pingMs: Date.now() - startedAt,
        schema: schemaName,
        connectedDatabase: row?.database_name,
        connectedSchema: row?.current_schema,
        connectedUser: row?.database_user,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      "[db_startup_health]",
      JSON.stringify({
        stage: "ping_failed",
        pingMs: Date.now() - startedAt,
        schema: schemaName,
        error: message,
      }),
    );
  }
}
