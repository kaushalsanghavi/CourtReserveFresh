import { sql, type SQLWrapper } from "drizzle-orm";
import type { Member } from "@shared/schema";

export type MemberStatusFilter = "active" | "inactive" | "all";

export const INACTIVE_MEMBER_BOOKING_MESSAGE =
  "This member is inactive and cannot make new bookings.";

type SqlExecutor = {
  execute: (query: string | SQLWrapper) => unknown;
};

export function normalizeMemberStatusFilter(raw: unknown): MemberStatusFilter | null {
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (value == null || value === "") {
    return "all";
  }

  if (value === "active" || value === "inactive" || value === "all") {
    return value;
  }

  return null;
}

export function coerceDbBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true" || value === "t" || value === "1";
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return false;
}

export function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

export function isMemberActive(member: Pick<Member, "isActive"> | null | undefined): boolean {
  return !!member?.isActive;
}

export async function ensureMemberStatusSchema(params: {
  db: SqlExecutor;
  schemaName: string;
}): Promise<void> {
  const { db, schemaName } = params;

  await db.execute(
    sql.raw(
      `ALTER TABLE ${schemaName}.members ADD COLUMN IF NOT EXISTS is_active boolean`,
    ),
  );
  await db.execute(
    sql.raw(
      `ALTER TABLE ${schemaName}.members ADD COLUMN IF NOT EXISTS status_changed_at timestamp`,
    ),
  );
  await db.execute(
    sql.raw(
      `UPDATE ${schemaName}.members
       SET is_active = COALESCE(is_active, true),
           status_changed_at = COALESCE(status_changed_at, created_at, now())
       WHERE is_active IS NULL OR status_changed_at IS NULL`,
    ),
  );
  await db.execute(
    sql.raw(
      `ALTER TABLE ${schemaName}.members ALTER COLUMN is_active SET DEFAULT true`,
    ),
  );
  await db.execute(
    sql.raw(
      `ALTER TABLE ${schemaName}.members ALTER COLUMN status_changed_at SET DEFAULT now()`,
    ),
  );
  await db.execute(
    sql.raw(
      `ALTER TABLE ${schemaName}.members ALTER COLUMN is_active SET NOT NULL`,
    ),
  );
  await db.execute(
    sql.raw(
      `ALTER TABLE ${schemaName}.members ALTER COLUMN status_changed_at SET NOT NULL`,
    ),
  );

  await db.execute(
    sql.raw(
      `CREATE TABLE IF NOT EXISTS ${schemaName}.member_status_events (
        id text PRIMARY KEY,
        member_id text NOT NULL REFERENCES ${schemaName}.members(id) ON DELETE CASCADE,
        from_is_active boolean NOT NULL,
        to_is_active boolean NOT NULL,
        changed_by text NOT NULL,
        reason text,
        source text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )`,
    ),
  );
  await db.execute(
    sql.raw(
      `CREATE INDEX IF NOT EXISTS member_status_events_member_id_created_at_idx
       ON ${schemaName}.member_status_events (member_id, created_at DESC)`,
    ),
  );
}
