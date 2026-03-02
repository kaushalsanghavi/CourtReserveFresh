import OpenAI from "openai";
import { lt } from "drizzle-orm";
import { aiChatTraces } from "../../shared/schema.js";
import { db } from "../db.js";
import {
  aiChatRequestSchema,
  type AiChatRequest,
  type AiChatResponse,
  type ScopeDecision,
  type SqlGeneration,
} from "../../shared/ai-chat.js";
import { runScopeGate } from "./scope-gate.js";
import { generateSqlForQuestion } from "./sql-generator.js";
import { validateGeneratedSql } from "./sql-validator.js";
import { executeSqlReadOnly } from "./sql-executor.js";
import { synthesizeAnswerFromRows } from "./answer-synthesizer.js";
import { formatSqlSchemaDictionary } from "./sql-surface.js";
import type { LlmModel } from "./llm-model.js";

type LegacyHandler = (message: string) => Promise<string>;

type AiTrace = NonNullable<NonNullable<AiChatResponse["meta"]>["trace"]>;
type ValidationOutcome = "passed" | "failed" | "skipped";

export type AiChatStage =
  | "classifying_scope"
  | "generating_sql"
  | "validating_sql"
  | "running_query"
  | "synthesizing_answer";

export type AiChatStageStatus = "started" | "completed" | "failed";

export interface AiChatProgressEvent {
  requestId: string;
  stage: AiChatStage;
  status: AiChatStageStatus;
  message: string;
  timestamp: string;
}

export interface SqlChatTelemetry {
  requestId: string;
  scopeDecision: ScopeDecision;
  intent?: string;
  generatedSql?: string;
  validationOutcome: ValidationOutcome;
  execMs?: number;
  rowCount?: number;
  policyViolation: boolean;
  mode: "answer" | "refusal" | "clarify";
  confidence?: number;
  fallbackReason?: string;
  error?: string;
}

export interface SqlChatPipelineResult {
  response: AiChatResponse;
  telemetry: SqlChatTelemetry;
}

export class AiChatRequestError extends Error {
  readonly status = 400;
}

const progressListeners = new Map<string, Set<(event: AiChatProgressEvent) => void>>();
let lastTraceRetentionSweepMs = 0;
const TRACE_RETENTION_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

function envFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function createRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resolveRequestId(input: AiChatRequest): string {
  const requestId = input.requestId?.trim();
  return requestId && requestId.length > 0 ? requestId : createRequestId();
}

function buildDecisionSummary(
  mode: "answer" | "refusal" | "clarify",
  trace: AiTrace,
): string {
  if (mode === "answer") {
    const execPart =
      typeof trace.execMs === "number" ? `executed in ${trace.execMs}ms` : "executed query";
    const rowPart =
      typeof trace.rowCount === "number" ? `with ${trace.rowCount} rows` : "with available rows";
    return `In-scope badminton query; generated safe SQL; ${execPart} ${rowPart}.`;
  }

  if (mode === "refusal") {
    return "Out-of-scope query (non-badminton), refused before SQL generation.";
  }

  if (trace.validationOutcome === "failed") {
    return "In-scope intent detected, but generated SQL failed safety validation; asked user to rephrase.";
  }

  return "Query needs clarification before a safe badminton SQL answer can be generated.";
}

function attachTraceAndSummary(
  response: AiChatResponse,
  telemetry: SqlChatTelemetry,
): AiChatResponse {
  const trace: AiTrace = {
    scopeDecision: telemetry.scopeDecision,
    intent: telemetry.intent,
    sql: telemetry.generatedSql,
    validationOutcome: telemetry.validationOutcome,
    rowCount: telemetry.rowCount,
    execMs: telemetry.execMs,
    fallbackReason: telemetry.fallbackReason ?? telemetry.error,
  };

  const sanitizedTrace = Object.fromEntries(
    Object.entries(trace).filter(([, value]) => value !== undefined),
  ) as AiTrace;

  const decisionSummary = buildDecisionSummary(response.mode, sanitizedTrace);

  return {
    ...response,
    meta: {
      requestId: telemetry.requestId,
      confidence: response.meta?.confidence,
      decisionSummary,
      trace: sanitizedTrace,
    },
  };
}

function refusalResponse(requestId: string): AiChatResponse {
  return {
    reply:
      "I can only help with badminton questions using CourtReserve data. Ask me about bookings, members, participation, or activity stats.",
    mode: "refusal",
    meta: { requestId, confidence: 1 },
  };
}

function clarifyResponse(
  requestId: string,
  confidence?: number,
  message?: string,
): AiChatResponse {
  return {
    reply:
      message ??
      "Can you rephrase that as a badminton booking/member/activity question using CourtReserve data?",
    mode: "clarify",
    meta: { requestId, confidence },
  };
}

function canRetry(generation: SqlGeneration): boolean {
  return generation.confidence >= 0.7;
}

function extractUnknownColumn(errorText: string): string | null {
  const match = errorText.match(/column\s+"?([a-zA-Z0-9_\.]+)"?\s+does not exist/i);
  if (!match) {
    return null;
  }
  return match[1];
}

function buildRetryErrorContext(
  reason: string,
  failedSql: string,
): string {
  const unknownColumn = extractUnknownColumn(reason);
  const prefix = unknownColumn
    ? `Unknown column detected: ${unknownColumn}.`
    : "SQL generation failed validation or execution.";

  return `${prefix}
Failure reason:
${reason}

Failed SQL:
${failedSql}

Use only this authoritative schema:
${formatSqlSchemaDictionary()}

Regenerate a single safe SELECT query that uses only valid columns.`;
}

function getModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  const client = new OpenAI({ apiKey });
  const modelName = process.env.AI_SQL_MODEL || "gpt-4o-mini";

  const model: LlmModel = {
    async generateContent(prompt: string) {
      const result = await client.chat.completions.create({
        model: modelName,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      });
      const text = result.choices[0]?.message?.content?.trim() ?? "";
      return {
        response: {
          text: () => text,
        },
      };
    },
  };

  return model;
}

function emitProgress(
  requestId: string,
  stage: AiChatStage,
  status: AiChatStageStatus,
  message: string,
): void {
  const listeners = progressListeners.get(requestId);
  if (!listeners || listeners.size === 0) {
    return;
  }

  const event: AiChatProgressEvent = {
    requestId,
    stage,
    status,
    message,
    timestamp: new Date().toISOString(),
  };

  listeners.forEach((listener) => {
    listener(event);
  });
}

export function subscribeToAiChatProgress(
  requestId: string,
  listener: (event: AiChatProgressEvent) => void,
): () => void {
  const normalizedRequestId = requestId.trim();
  if (!progressListeners.has(normalizedRequestId)) {
    progressListeners.set(normalizedRequestId, new Set());
  }

  const listeners = progressListeners.get(normalizedRequestId)!;
  listeners.add(listener);

  return () => {
    const current = progressListeners.get(normalizedRequestId);
    if (!current) {
      return;
    }

    current.delete(listener);
    if (current.size === 0) {
      progressListeners.delete(normalizedRequestId);
    }
  };
}

async function enforceTraceRetentionBestEffort(): Promise<void> {
  const now = Date.now();
  if (now - lastTraceRetentionSweepMs < TRACE_RETENTION_SWEEP_INTERVAL_MS) {
    return;
  }

  lastTraceRetentionSweepMs = now;

  const cutoff = new Date(now - 14 * 24 * 60 * 60 * 1000);
  await db.delete(aiChatTraces).where(lt(aiChatTraces.createdAt, cutoff));
}

async function persistTraceBestEffort(
  response: AiChatResponse,
  telemetry: SqlChatTelemetry,
): Promise<void> {
  const trace = response.meta?.trace;
  if (!trace) {
    return;
  }

  await db
    .insert(aiChatTraces)
    .values({
      requestId: telemetry.requestId,
      mode: response.mode,
      scopeDecision: trace.scopeDecision,
      intent: trace.intent,
      sqlText: trace.sql,
      validationOutcome: trace.validationOutcome,
      rowCount: trace.rowCount,
      execMs: trace.execMs,
      fallbackReason: trace.fallbackReason,
      decisionSummary: response.meta?.decisionSummary,
    })
    .onConflictDoNothing({ target: aiChatTraces.requestId });

  await enforceTraceRetentionBestEffort();
}

function logTrace(response: AiChatResponse, telemetry: SqlChatTelemetry): void {
  console.info(
    "[ai_chat_trace]",
    JSON.stringify({
      requestId: telemetry.requestId,
      mode: response.mode,
      confidence: response.meta?.confidence,
      decisionSummary: response.meta?.decisionSummary,
      trace: response.meta?.trace,
    }),
  );
}

function logShadowTelemetry(telemetry: SqlChatTelemetry): void {
  console.info(
    "[ai_sql_shadow]",
    JSON.stringify({
      requestId: telemetry.requestId,
      scopeDecision: telemetry.scopeDecision,
      generatedSql: telemetry.generatedSql,
      validationOutcome: telemetry.validationOutcome,
      execMs: telemetry.execMs,
      rowCount: telemetry.rowCount,
      wouldAnswerMode: telemetry.mode,
      policyViolation: telemetry.policyViolation,
      confidence: telemetry.confidence,
      intent: telemetry.intent,
      fallbackReason: telemetry.fallbackReason,
      error: telemetry.error,
    }),
  );
}

async function attemptSqlPipeline(
  model: ReturnType<typeof getModel>,
  input: AiChatRequest,
  requestId: string,
): Promise<SqlChatPipelineResult> {
  const telemetry: SqlChatTelemetry = {
    requestId,
    scopeDecision: "BORDERLINE",
    validationOutcome: "skipped",
    policyViolation: false,
    mode: "clarify",
  };

  if (!model) {
    telemetry.fallbackReason = "AI chat is not configured: missing OPENAI_API_KEY";
    return {
      response: clarifyResponse(
        requestId,
        undefined,
        "AI chat is not configured. Please set OPENAI_API_KEY.",
      ),
      telemetry: {
        ...telemetry,
        error: "Missing OPENAI_API_KEY",
      },
    };
  }

  emitProgress(requestId, "classifying_scope", "started", "Classifying scope...");
  const scopeDecision = await runScopeGate(input.message, model);
  emitProgress(requestId, "classifying_scope", "completed", "Scope classified.");
  telemetry.scopeDecision = scopeDecision;

  if (scopeDecision === "OUT_OF_SCOPE_CLEAR") {
    telemetry.mode = "refusal";
    telemetry.fallbackReason = "Prompt classified as non-badminton generic query";
    return {
      response: refusalResponse(requestId),
      telemetry,
    };
  }

  if (scopeDecision === "BORDERLINE") {
    telemetry.mode = "clarify";
    telemetry.fallbackReason = "Borderline prompt needs clarification";
    return {
      response: clarifyResponse(requestId),
      telemetry,
    };
  }

  emitProgress(requestId, "generating_sql", "started", "Generating SQL...");
  let generation = await generateSqlForQuestion(model, {
    message: input.message,
    clientTimeZone: input.clientTimeZone,
  });
  emitProgress(requestId, "generating_sql", "completed", "SQL generated.");

  telemetry.intent = generation.intent;

  emitProgress(requestId, "validating_sql", "started", "Validating SQL safety...");
  let validation = validateGeneratedSql(generation.sql);
  telemetry.generatedSql = generation.sql;
  telemetry.confidence = generation.confidence;
  telemetry.validationOutcome = validation.ok ? "passed" : "failed";
  telemetry.policyViolation = !validation.ok;

  if (!validation.ok && canRetry(generation)) {
    emitProgress(requestId, "generating_sql", "started", "Regenerating SQL after validation failure...");
    generation = await generateSqlForQuestion(model, {
      message: input.message,
      clientTimeZone: input.clientTimeZone,
      previousError: buildRetryErrorContext(
        validation.reason ?? "SQL validation failed",
        generation.sql,
      ),
    });
    emitProgress(requestId, "generating_sql", "completed", "SQL regenerated.");

    telemetry.intent = generation.intent;

    validation = validateGeneratedSql(generation.sql);
    telemetry.generatedSql = generation.sql;
    telemetry.confidence = generation.confidence;
    telemetry.validationOutcome = validation.ok ? "passed" : "failed";
    telemetry.policyViolation = !validation.ok;
  }

  if (!validation.ok) {
    emitProgress(requestId, "validating_sql", "failed", "SQL failed safety validation.");
    telemetry.mode = "clarify";
    telemetry.fallbackReason = validation.reason ?? "SQL validation failed";
    const response = clarifyResponse(requestId, generation.confidence);
    return {
      response,
      telemetry: {
        ...telemetry,
        error: validation.reason,
      },
    };
  }

  emitProgress(requestId, "validating_sql", "completed", "SQL is safe to execute.");

  try {
    emitProgress(requestId, "running_query", "started", "Running query...");
    const execution = await executeSqlReadOnly(validation.sql, 2000);
    emitProgress(requestId, "running_query", "completed", "Query execution completed.");

    telemetry.execMs = execution.execMs;
    telemetry.rowCount = execution.rows.length;
    telemetry.generatedSql = validation.sql;

    emitProgress(requestId, "synthesizing_answer", "started", "Synthesizing answer...");
    const answer = await synthesizeAnswerFromRows(model, {
      question: input.message,
      rows: execution.rows,
    });
    emitProgress(requestId, "synthesizing_answer", "completed", "Answer synthesized.");

    const response: AiChatResponse = {
      reply: answer,
      mode: "answer",
      meta: {
        requestId,
        confidence: generation.confidence,
      },
    };
    telemetry.mode = "answer";
    return {
      response,
      telemetry,
    };
  } catch (error) {
    emitProgress(requestId, "running_query", "failed", "Query failed or timed out.");

    if (canRetry(generation)) {
      emitProgress(requestId, "generating_sql", "started", "Regenerating SQL after runtime error...");
      const retryGeneration = await generateSqlForQuestion(model, {
        message: input.message,
        clientTimeZone: input.clientTimeZone,
        previousError: buildRetryErrorContext(
          error instanceof Error
            ? error.message
            : "Runtime SQL execution error",
          validation.sql,
        ),
      });
      emitProgress(requestId, "generating_sql", "completed", "Retry SQL generated.");

      telemetry.intent = retryGeneration.intent;

      const retryValidation = validateGeneratedSql(retryGeneration.sql);
      telemetry.generatedSql = retryGeneration.sql;
      telemetry.confidence = retryGeneration.confidence;
      telemetry.validationOutcome = retryValidation.ok ? "passed" : "failed";
      telemetry.policyViolation = !retryValidation.ok;

      if (retryValidation.ok) {
        try {
          emitProgress(requestId, "running_query", "started", "Running retry query...");
          const retryExecution = await executeSqlReadOnly(retryValidation.sql, 2000);
          emitProgress(requestId, "running_query", "completed", "Retry query completed.");

          telemetry.execMs = retryExecution.execMs;
          telemetry.rowCount = retryExecution.rows.length;
          telemetry.generatedSql = retryValidation.sql;

          emitProgress(requestId, "synthesizing_answer", "started", "Synthesizing answer...");
          const retryAnswer = await synthesizeAnswerFromRows(model, {
            question: input.message,
            rows: retryExecution.rows,
          });
          emitProgress(requestId, "synthesizing_answer", "completed", "Answer synthesized.");

          const retryResponse: AiChatResponse = {
            reply: retryAnswer,
            mode: "answer",
            meta: {
              requestId,
              confidence: retryGeneration.confidence,
            },
          };

          telemetry.mode = "answer";
          return {
            response: retryResponse,
            telemetry,
          };
        } catch (retryError) {
          emitProgress(requestId, "running_query", "failed", "Retry query failed or timed out.");
          telemetry.mode = "clarify";
          telemetry.fallbackReason =
            retryError instanceof Error
              ? retryError.message
              : "Retry execution error";
          const clarify = clarifyResponse(requestId, retryGeneration.confidence);
          return {
            response: clarify,
            telemetry: {
              ...telemetry,
              error:
                retryError instanceof Error
                  ? retryError.message
                  : "Retry execution error",
            },
          };
        }
      }
    }

    telemetry.mode = "clarify";
    telemetry.fallbackReason =
      error instanceof Error ? error.message : "Execution failed";

    const response = clarifyResponse(requestId, generation.confidence);
    return {
      response,
      telemetry: {
        ...telemetry,
        error: error instanceof Error ? error.message : "Execution failed",
      },
    };
  }
}

export async function runSqlChatPipelineDetailed(
  input: AiChatRequest,
): Promise<SqlChatPipelineResult> {
  const requestId = resolveRequestId(input);
  const model = getModel();
  const result = await attemptSqlPipeline(model, input, requestId);
  const responseWithTrace = attachTraceAndSummary(result.response, result.telemetry);

  try {
    await persistTraceBestEffort(responseWithTrace, result.telemetry);
  } catch (persistError) {
    console.error("[ai_chat_trace_persist_error]", {
      requestId,
      error: persistError instanceof Error ? persistError.message : persistError,
    });
  }

  logTrace(responseWithTrace, result.telemetry);
  return {
    response: responseWithTrace,
    telemetry: result.telemetry,
  };
}

export async function handleAiChatRequest(
  rawInput: unknown,
  legacyHandler?: LegacyHandler,
): Promise<AiChatResponse> {
  const parsed = aiChatRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AiChatRequestError("Invalid request body for AI chat.");
  }

  const input = parsed.data;
  const sqlChatEnabled = envFlag("AI_SQL_CHAT_ENABLED", false);
  const shadowMode = envFlag("AI_SQL_SHADOW_MODE", false);
  const requestId = resolveRequestId(input);

  if (!sqlChatEnabled) {
    if (shadowMode) {
      void runSqlChatPipelineDetailed(input)
        .then((result) => {
          logShadowTelemetry(result.telemetry);
        })
        .catch((error: unknown) => {
          console.error("[ai_sql_shadow_error]", error);
        });
    }

    if (legacyHandler) {
      const reply = await legacyHandler(input.message);
      const response: AiChatResponse = {
        reply,
        mode: "answer",
        meta: {
          requestId,
          decisionSummary: "Legacy chat path used; SQL trace is unavailable for this response.",
          trace: {
            scopeDecision: "IN_SCOPE",
            validationOutcome: "skipped",
            fallbackReason: "Legacy handler path",
          },
        },
      };
      return response;
    }

    return attachTraceAndSummary(clarifyResponse(requestId), {
      requestId,
      scopeDecision: "BORDERLINE",
      validationOutcome: "skipped",
      policyViolation: false,
      mode: "clarify",
      fallbackReason: "SQL chat disabled and no legacy handler",
    });
  }

  const result = await runSqlChatPipelineDetailed({
    ...input,
    requestId,
  });

  if (input.debug) {
    logShadowTelemetry(result.telemetry);
  }

  return result.response;
}
