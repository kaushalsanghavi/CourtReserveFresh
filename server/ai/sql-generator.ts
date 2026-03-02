import type { LlmModel } from "./llm-model.js";
import {
  sqlGenerationSchema,
  type SqlGeneration,
} from "../../shared/ai-chat.js";
import { formatSqlSchemaDictionary } from "./sql-surface.js";

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeSql(sql: string): string {
  return sql.trim().replace(/;+\s*$/, "");
}

export interface GenerateSqlInput {
  message: string;
  clientTimeZone?: string;
  previousError?: string;
}

export async function generateSqlForQuestion(
  model: LlmModel,
  input: GenerateSqlInput,
): Promise<SqlGeneration> {
  const { message, clientTimeZone, previousError } = input;

  const repairContext = previousError
    ? `\nPrevious SQL attempt failed:\n${previousError}\nRegenerate SQL by strictly using only the schema below.\n`
    : "";

  const prompt = `
You generate safe Postgres read-only SQL for CourtReserve badminton analytics.

Priority data sources (use first):
- ai_booking_facts
- ai_activity_facts
- ai_member_facts
- ai_comment_facts

Allowed fallback base tables:
- bookings
- activities
- members
- comments

Authoritative schema (use only these columns):
${formatSqlSchemaDictionary()}

Rules:
- single SELECT statement only
- no comments
- no DDL/DML
- always include LIMIT <= 200
- prefer LIMIT 100 if unsure
- answer ONLY from CourtReserve badminton domain data
- use ONLY columns listed in the authoritative schema above
- if a column is not listed, do not infer or invent it
- Use ONLY these SQL functions: COUNT, SUM, AVG, MIN, MAX, DATE_TRUNC, EXTRACT, DATE_PART, CAST, COALESCE, LOWER, UPPER, ROUND, NULLIF, CURRENT_DATE, CURRENT_TIMESTAMP, NOW, TIMEZONE
- Avoid AT TIME ZONE syntax; prefer DATE_TRUNC/EXTRACT with CURRENT_DATE or CURRENT_TIMESTAMP
- Prefer ai_booking_facts.member_name directly for booking leaderboards (avoid unnecessary joins)
- timezone context for relative dates: ${clientTimeZone ?? "server default timezone"}

Return JSON only:
{"sql":"...","intent":"...","confidence":0.0}
${repairContext}
User question:
${message}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    return {
      sql: "SELECT 1 WHERE FALSE LIMIT 1",
      intent: "unparsed",
      confidence: 0,
    };
  }

  try {
    const parsed = JSON.parse(jsonText);
    const validation = sqlGenerationSchema.safeParse(parsed);
    if (!validation.success) {
      return {
        sql: "SELECT 1 WHERE FALSE LIMIT 1",
        intent: "invalid_payload",
        confidence: 0,
      };
    }

    return {
      ...validation.data,
      sql: normalizeSql(validation.data.sql),
      confidence: clampConfidence(validation.data.confidence),
    };
  } catch {
    return {
      sql: "SELECT 1 WHERE FALSE LIMIT 1",
      intent: "invalid_json",
      confidence: 0,
    };
  }
}
