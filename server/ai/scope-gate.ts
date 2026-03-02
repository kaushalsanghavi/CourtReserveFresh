import type { LlmModel } from "./llm-model.js";
import {
  scopeDecisionSchema,
  type ScopeDecision,
} from "../../shared/ai-chat.js";

const IN_SCOPE_TERMS = [
  "badminton",
  "courtreserve",
  "court",
  "courts",
  "book",
  "books",
  "booked",
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

const BOOKING_ANALYTICS_CUES = [
  "how busy",
  "busiest",
  "most common",
  "first person",
  "first to book",
  "same time",
  "at the same time",
  "who usually",
  "who often",
  "who tends to",
];

const TEMPORAL_CUES = [
  "today",
  "tonight",
  "tomorrow",
  "this week",
  "this month",
  "this quarter",
  "given day",
  "per day",
  "daily",
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
  const hasBookingAnalyticsCue = BOOKING_ANALYTICS_CUES.some((term) =>
    lower.includes(term),
  );
  const hasTemporalCue = TEMPORAL_CUES.some((term) => lower.includes(term));

  // Treat implicit booking analytics phrasing as in-scope to avoid false refusals.
  if (hasBookingAnalyticsCue && (hasTemporalCue || lower.includes("book"))) {
    return "IN_SCOPE";
  }

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
  model: LlmModel,
): Promise<ScopeDecision> {
  const prompt = `
You are a strict scope classifier for CourtReserve AI chat.

Allowed scope:
- badminton questions tied to CourtReserve data (members, bookings, participation, activity, comments)
- implicit booking analytics phrasing, even without the word badminton
  (examples: "How busy will it be today?", "Who books many days at the same time?",
  "For any given day, who's the most common first person to book?")

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
  model: LlmModel,
): Promise<ScopeDecision> {
  const firstPass = deterministicScopeDecision(message);
  if (firstPass !== "BORDERLINE") {
    return firstPass;
  }
  return llmClassifyScope(message, model);
}
