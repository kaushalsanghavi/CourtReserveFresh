import { sql, type SQLWrapper } from "drizzle-orm";

type SqlExecutor = {
  execute: (query: string | SQLWrapper) => unknown;
};

export async function ensureFineSchema(params: {
  db: SqlExecutor;
  schemaName: string;
}): Promise<void> {
  const { db, schemaName } = params;

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaName}.fines (
      id text PRIMARY KEY,
      member_id text NOT NULL REFERENCES ${schemaName}.members(id),
      member_name text NOT NULL,
      incident_date date NOT NULL,
      reason text NOT NULL CHECK (reason IN ('late', 'no-show')),
      amount integer NOT NULL CHECK (amount IN (50, 100)),
      status text NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'paid', 'removed')),
      reported_by_member_id text NOT NULL REFERENCES ${schemaName}.members(id),
      reporter_name text NOT NULL,
      report_note text,
      reported_at timestamptz NOT NULL DEFAULT now(),
      paid_by_member_id text REFERENCES ${schemaName}.members(id),
      paid_by_name text,
      paid_at timestamptz,
      removed_by_member_id text REFERENCES ${schemaName}.members(id),
      removed_by_name text,
      removal_reason text,
      removed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaName}.fine_events (
      id text PRIMARY KEY,
      fine_id text NOT NULL REFERENCES ${schemaName}.fines(id),
      incident_date date NOT NULL,
      action text NOT NULL CHECK (action IN ('reported', 'paid', 'removed')),
      actor_member_id text NOT NULL REFERENCES ${schemaName}.members(id),
      actor_name text NOT NULL,
      subject_member_id text NOT NULL REFERENCES ${schemaName}.members(id),
      subject_member_name text NOT NULL,
      reason text NOT NULL CHECK (reason IN ('late', 'no-show')),
      amount integer NOT NULL,
      note text,
      device_info text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `));
  await db.execute(sql.raw(`
    CREATE INDEX IF NOT EXISTS fines_incident_date_idx
    ON ${schemaName}.fines (incident_date)
  `));
  await db.execute(sql.raw(`
    ALTER TABLE ${schemaName}.fines DROP CONSTRAINT IF EXISTS fines_amount_check
  `));
  await db.execute(sql.raw(`
    ALTER TABLE ${schemaName}.fines ADD CONSTRAINT fines_amount_check
    CHECK ((reason = 'late' AND amount = 50) OR (reason = 'no-show' AND amount = 100))
  `));
  await db.execute(sql.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS fines_member_incident_active_uidx
    ON ${schemaName}.fines (member_id, incident_date)
    WHERE status <> 'removed'
  `));
  await db.execute(sql.raw(`
    CREATE INDEX IF NOT EXISTS fine_events_fine_id_created_at_idx
    ON ${schemaName}.fine_events (fine_id, created_at DESC)
  `));
  await db.execute(sql.raw(`
    CREATE INDEX IF NOT EXISTS fine_events_incident_date_created_at_idx
    ON ${schemaName}.fine_events (incident_date, created_at DESC)
  `));
}
