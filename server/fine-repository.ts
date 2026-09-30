import { sql, type SQLWrapper } from "drizzle-orm";
import type { Fine, FineEvent, FineReason } from "@shared/schema";
import { escapeSqlString } from "./member-status";

type QueryResult = { rows?: Array<Record<string, unknown>> };
type SqlExecutor = { execute: (query: string | SQLWrapper) => Promise<unknown> | unknown };

function uuid(): string {
  return globalThis.crypto.randomUUID();
}

function nullable(value: string | undefined): string {
  return value ? `'${escapeSqlString(value)}'` : "NULL";
}

function asDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

function asDateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function monthBounds(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = monthNumber === 12
    ? { year: year + 1, month: 1 }
    : { year, month: monthNumber + 1 };
  return {
    start: `${year}-${String(monthNumber).padStart(2, "0")}-01`,
    end: `${next.year}-${String(next.month).padStart(2, "0")}-01`,
  };
}

function mapFine(row: Record<string, unknown>): Fine {
  return {
    id: String(row.id),
    memberId: String(row.member_id),
    memberName: String(row.member_name),
    incidentDate: asDateOnly(row.incident_date),
    reason: String(row.reason) as Fine["reason"],
    amount: Number(row.amount),
    status: String(row.status) as Fine["status"],
    reportedByMemberId: String(row.reported_by_member_id),
    reporterName: String(row.reporter_name),
    reportNote: row.report_note == null ? null : String(row.report_note),
    reportedAt: asDate(row.reported_at),
    paidByMemberId: row.paid_by_member_id == null ? null : String(row.paid_by_member_id),
    paidByName: row.paid_by_name == null ? null : String(row.paid_by_name),
    paidAt: row.paid_at == null ? null : asDate(row.paid_at),
    removedByMemberId: row.removed_by_member_id == null ? null : String(row.removed_by_member_id),
    removedByName: row.removed_by_name == null ? null : String(row.removed_by_name),
    removalReason: row.removal_reason == null ? null : String(row.removal_reason),
    removedAt: row.removed_at == null ? null : asDate(row.removed_at),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

function mapFineEvent(row: Record<string, unknown>): FineEvent {
  return {
    id: String(row.id),
    fineId: String(row.fine_id),
    incidentDate: asDateOnly(row.incident_date),
    action: String(row.action) as FineEvent["action"],
    actorMemberId: String(row.actor_member_id),
    actorName: String(row.actor_name),
    subjectMemberId: String(row.subject_member_id),
    subjectMemberName: String(row.subject_member_name),
    reason: String(row.reason) as FineEvent["reason"],
    amount: Number(row.amount),
    note: row.note == null ? null : String(row.note),
    deviceInfo: String(row.device_info),
    createdAt: asDate(row.created_at),
  };
}

export function isFineDuplicateError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  return candidate.code === "23505" || isFineDuplicateError(candidate.cause);
}

export class FineRepository {
  constructor(
    private readonly db: SqlExecutor,
    private readonly schemaName: string,
  ) {}

  private async rows(query: SQLWrapper): Promise<Array<Record<string, unknown>>> {
    const result = await this.db.execute(query) as QueryResult;
    return result.rows ?? [];
  }

  async listByMonth(month: string): Promise<Fine[]> {
    const bounds = monthBounds(month);
    const rows = await this.rows(sql.raw(`
      SELECT * FROM ${this.schemaName}.fines
      WHERE incident_date >= '${bounds.start}' AND incident_date < '${bounds.end}'
        AND status <> 'removed'
      ORDER BY incident_date DESC, reported_at DESC
    `));
    return rows.map(mapFine);
  }

  async listEventsByMonth(month: string): Promise<FineEvent[]> {
    const bounds = monthBounds(month);
    const rows = await this.rows(sql.raw(`
      SELECT * FROM ${this.schemaName}.fine_events
      WHERE incident_date >= '${bounds.start}' AND incident_date < '${bounds.end}'
      ORDER BY created_at DESC
    `));
    return rows.map(mapFineEvent);
  }

  async listEventsByDate(date: string): Promise<FineEvent[]> {
    const rows = await this.rows(sql.raw(`
      SELECT * FROM ${this.schemaName}.fine_events
      WHERE incident_date = '${escapeSqlString(date)}'
      ORDER BY created_at DESC
    `));
    return rows.map(mapFineEvent);
  }

  async report(params: {
    memberId: string;
    actorMemberId: string;
    incidentDate: string;
    reason: FineReason;
    amount: number;
    note?: string;
    deviceInfo: string;
  }): Promise<Fine | null> {
    const fineId = uuid();
    const eventId = uuid();
    const rows = await this.rows(sql.raw(`
      WITH subject AS (
        SELECT id, name FROM ${this.schemaName}.members
        WHERE id = '${escapeSqlString(params.memberId)}' AND is_active = true
      ), actor AS (
        SELECT id, name FROM ${this.schemaName}.members
        WHERE id = '${escapeSqlString(params.actorMemberId)}' AND is_active = true
      ), inserted AS (
        INSERT INTO ${this.schemaName}.fines (
          id, member_id, member_name, incident_date, reason, amount, status,
          reported_by_member_id, reporter_name, report_note,
          reported_at, created_at, updated_at
        )
        SELECT
          '${fineId}', subject.id, subject.name, '${escapeSqlString(params.incidentDate)}',
          '${params.reason}', ${params.amount}, 'due', actor.id, actor.name,
          ${nullable(params.note)}, now(), now(), now()
        FROM subject CROSS JOIN actor
        RETURNING *
      ), logged AS (
        INSERT INTO ${this.schemaName}.fine_events (
          id, fine_id, incident_date, action, actor_member_id, actor_name,
          subject_member_id, subject_member_name, reason, amount, note,
          device_info, created_at
        )
        SELECT
          '${eventId}', id, incident_date, 'reported', reported_by_member_id,
          reporter_name, member_id, member_name, reason, amount, report_note,
          '${escapeSqlString(params.deviceInfo)}', now()
        FROM inserted
      )
      SELECT * FROM inserted
    `));
    return rows[0] ? mapFine(rows[0]) : null;
  }

  async markPaid(params: {
    fineId: string;
    actorMemberId: string;
    deviceInfo: string;
  }): Promise<Fine | null> {
    const eventId = uuid();
    const rows = await this.rows(sql.raw(`
      WITH actor AS (
        SELECT id, name FROM ${this.schemaName}.members
        WHERE id = '${escapeSqlString(params.actorMemberId)}' AND is_active = true
      ), updated AS (
        UPDATE ${this.schemaName}.fines AS fine
        SET status = 'paid', paid_by_member_id = actor.id, paid_by_name = actor.name,
            paid_at = now(), updated_at = now()
        FROM actor
        WHERE fine.id = '${escapeSqlString(params.fineId)}' AND fine.status = 'due'
        RETURNING fine.*
      ), logged AS (
        INSERT INTO ${this.schemaName}.fine_events (
          id, fine_id, incident_date, action, actor_member_id, actor_name,
          subject_member_id, subject_member_name, reason, amount, note,
          device_info, created_at
        )
        SELECT
          '${eventId}', id, incident_date, 'paid', paid_by_member_id,
          paid_by_name, member_id, member_name, reason, amount, NULL,
          '${escapeSqlString(params.deviceInfo)}', now()
        FROM updated
      )
      SELECT * FROM updated
    `));
    return rows[0] ? mapFine(rows[0]) : null;
  }

  async remove(params: {
    fineId: string;
    actorMemberId: string;
    reason: string;
    deviceInfo: string;
  }): Promise<Fine | null> {
    const eventId = uuid();
    const rows = await this.rows(sql.raw(`
      WITH actor AS (
        SELECT id, name FROM ${this.schemaName}.members
        WHERE id = '${escapeSqlString(params.actorMemberId)}' AND is_active = true
      ), updated AS (
        UPDATE ${this.schemaName}.fines AS fine
        SET status = 'removed', removed_by_member_id = actor.id,
            removed_by_name = actor.name,
            removal_reason = '${escapeSqlString(params.reason)}',
            removed_at = now(), updated_at = now()
        FROM actor
        WHERE fine.id = '${escapeSqlString(params.fineId)}'
          AND fine.status IN ('due', 'paid')
        RETURNING fine.*
      ), logged AS (
        INSERT INTO ${this.schemaName}.fine_events (
          id, fine_id, incident_date, action, actor_member_id, actor_name,
          subject_member_id, subject_member_name, reason, amount, note,
          device_info, created_at
        )
        SELECT
          '${eventId}', id, incident_date, 'removed', removed_by_member_id,
          removed_by_name, member_id, member_name, reason, amount,
          removal_reason, '${escapeSqlString(params.deviceInfo)}', now()
        FROM updated
      )
      SELECT * FROM updated
    `));
    return rows[0] ? mapFine(rows[0]) : null;
  }
}
