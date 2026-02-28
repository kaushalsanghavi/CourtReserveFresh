import type { GenerativeModel } from "@google/generative-ai";
import {
  scopeDecisionSchema,
  type ScopeDecision,
} from "../../shared/ai-chat.js";

const IN_SCOPE_TERMS = [
  "badminton",
  "courtreserve",
  "court",
  "booking",
  "bookings",
  "slot",
  "slots",
  "reservation",
  "member",
  "members",
  "player",
  "players",
  "participation",
  "activity",
  "activities",
  "comment",
  "comments",
  "shuttle",
  "racket",
  "smash",
  "doubles",
  "singles",
];

const CLEAR_OUT_OF_SCOPE_TERMS = [
  "weather",
  "rain",
  "temperature",
  "news",
  "politics",
  "election",
  "stock",
  "crypto",
  "bitcoin",
  "recipe",
  "movie",
  "music",
  "javascript",
  "python",
  "coding",
  "programming",
  "world cup",
];

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function deterministicScopeDecision(message: string): ScopeDecision {
  const lower = message.toLowerCase();
  const hasInScope = IN_SCOPE_TERMS.some((term) => lower.includes(term));
  const hasClearOutOfScope = CLEAR_OUT_OF_SCOPE_TERMS.some((term) =>
    lower.includes(term),
  );

  if (hasClearOutOfScope && !hasInScope) {
    return "OUT_OF_SCOPE_CLEAR";
  }
  if (hasInScope) {
    return "IN_SCOPE";
  }
  return "BORDERLINE";
}

export async function llmClassifyScope(
  message: string,
  model: GenerativeModel,
): Promise<ScopeDecision> {
  const prompt = `
You are a strict scope classifier for CourtReserve AI chat.

Allowed scope:
- badminton questions tied to CourtReserve data (members, bookings, participation, activity, comments)

Disallowed scope:
- generic world knowledge and non-badminton topics (weather, finance, politics, coding, entertainment)

Return JSON only:
{"decision":"IN_SCOPE|BORDERLINE|OUT_OF_SCOPE_CLEAR"}

User message:
${message}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    return "BORDERLINE";
  }

  try {
    const parsed = JSON.parse(jsonText) as { decision?: string };
    const decision = scopeDecisionSchema.safeParse(parsed.decision);
    return decision.success ? decision.data : "BORDERLINE";
  } catch {
    return "BORDERLINE";
  }
}

export async function runScopeGate(
  message: string,
  model: GenerativeModel,
): Promise<ScopeDecision> {
  const firstPass = deterministicScopeDecision(message);
  if (firstPass !== "BORDERLINE") {
    return firstPass;
  }
  return llmClassifyScope(message, model);
}
