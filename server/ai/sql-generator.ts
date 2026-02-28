import type { GenerativeModel } from "@google/generative-ai";
import {
  sqlGenerationSchema,
  type SqlGeneration,
} from "@shared/ai-chat";

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
  model: GenerativeModel,
  input: GenerateSqlInput,
): Promise<SqlGeneration> {
  const { message, clientTimeZone, previousError } = input;

  const repairContext = previousError
    ? `\nPrevious SQL attempt failed with this validation/runtime error:\n${previousError}\nGenerate a corrected SQL query.\n`
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

Rules:
- single SELECT statement only
- no comments
- no DDL/DML
- always include LIMIT <= 200
- prefer LIMIT 100 if unsure
- answer ONLY from CourtReserve badminton domain data
- timezone context: ${clientTimeZone ?? "server default timezone"}

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
