import { GoogleGenerativeAI } from "@google/generative-ai";
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

type LegacyHandler = (message: string) => Promise<string>;

export interface SqlChatTelemetry {
  requestId: string;
  scopeDecision: ScopeDecision;
  generatedSql?: string;
  validationOutcome: "passed" | "failed" | "skipped";
  execMs?: number;
  rowCount?: number;
  policyViolation: boolean;
  mode: "answer" | "refusal" | "clarify";
  confidence?: number;
  error?: string;
}

export interface SqlChatPipelineResult {
  response: AiChatResponse;
  telemetry: SqlChatTelemetry;
}

export class AiChatRequestError extends Error {
  readonly status = 400;
}

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

function refusalResponse(requestId: string): AiChatResponse {
  return {
    reply:
      "I can only help with badminton questions using CourtReserve data. Ask me about bookings, members, participation, or activity stats. ",
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
      "Hmm..Can you rephrase that as a badminton booking/member/activity question about using CourtReserve? I want to make sure I'm not stepping out of bounds",
    mode: "clarify",
    meta: { requestId, confidence },
  };
}

function canRetry(generation: SqlGeneration): boolean {
  return generation.confidence >= 0.7;
}

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: process.env.AI_SQL_MODEL || "gemini-1.5-flash",
  });
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
    return {
      response: clarifyResponse(
        requestId,
        undefined,
        "AI chat is not configured. Please set GEMINI_API_KEY.",
      ),
      telemetry: {
        ...telemetry,
        error: "Missing GEMINI_API_KEY",
      },
    };
  }

  const scopeDecision = await runScopeGate(input.message, model);
  telemetry.scopeDecision = scopeDecision;

  if (scopeDecision === "OUT_OF_SCOPE_CLEAR") {
    const response = refusalResponse(requestId);
    return {
      response,
      telemetry: { ...telemetry, mode: response.mode },
    };
  }

  if (scopeDecision === "BORDERLINE") {
    const response = clarifyResponse(requestId);
    return {
      response,
      telemetry: { ...telemetry, mode: response.mode },
    };
  }

  let generation = await generateSqlForQuestion(model, {
    message: input.message,
    clientTimeZone: input.clientTimeZone,
  });

  let validation = validateGeneratedSql(generation.sql);
  telemetry.generatedSql = generation.sql;
  telemetry.confidence = generation.confidence;
  telemetry.validationOutcome = validation.ok ? "passed" : "failed";
  telemetry.policyViolation = !validation.ok;

  if (!validation.ok && canRetry(generation)) {
    generation = await generateSqlForQuestion(model, {
      message: input.message,
      clientTimeZone: input.clientTimeZone,
      previousError: validation.reason,
    });

    validation = validateGeneratedSql(generation.sql);
    telemetry.generatedSql = generation.sql;
    telemetry.confidence = generation.confidence;
    telemetry.validationOutcome = validation.ok ? "passed" : "failed";
    telemetry.policyViolation = !validation.ok;
  }

  if (!validation.ok) {
    const response = clarifyResponse(requestId, generation.confidence);
    return {
      response,
      telemetry: {
        ...telemetry,
        mode: response.mode,
        error: validation.reason,
      },
    };
  }

  try {
    const execution = await executeSqlReadOnly(validation.sql, 2000);
    telemetry.execMs = execution.execMs;
    telemetry.rowCount = execution.rows.length;

    const answer = await synthesizeAnswerFromRows(model, {
      question: input.message,
      rows: execution.rows,
    });

    const response: AiChatResponse = {
      reply: answer,
      mode: "answer",
      meta: {
        requestId,
        confidence: generation.confidence,
      },
    };
    return {
      response,
      telemetry: {
        ...telemetry,
        generatedSql: validation.sql,
        mode: response.mode,
      },
    };
  } catch (error) {
    if (canRetry(generation)) {
      const retryGeneration = await generateSqlForQuestion(model, {
        message: input.message,
        clientTimeZone: input.clientTimeZone,
        previousError:
          error instanceof Error
            ? error.message
            : "Runtime SQL execution error",
      });
      const retryValidation = validateGeneratedSql(retryGeneration.sql);
      telemetry.generatedSql = retryGeneration.sql;
      telemetry.confidence = retryGeneration.confidence;
      telemetry.validationOutcome = retryValidation.ok ? "passed" : "failed";
      telemetry.policyViolation = !retryValidation.ok;

      if (retryValidation.ok) {
        try {
          const retryExecution = await executeSqlReadOnly(retryValidation.sql, 2000);
          telemetry.execMs = retryExecution.execMs;
          telemetry.rowCount = retryExecution.rows.length;

          const retryAnswer = await synthesizeAnswerFromRows(model, {
            question: input.message,
            rows: retryExecution.rows,
          });

          const retryResponse: AiChatResponse = {
            reply: retryAnswer,
            mode: "answer",
            meta: {
              requestId,
              confidence: retryGeneration.confidence,
            },
          };
          return {
            response: retryResponse,
            telemetry: {
              ...telemetry,
              generatedSql: retryValidation.sql,
              mode: retryResponse.mode,
            },
          };
        } catch (retryError) {
          const clarify = clarifyResponse(requestId, retryGeneration.confidence);
          return {
            response: clarify,
            telemetry: {
              ...telemetry,
              mode: clarify.mode,
              error:
                retryError instanceof Error
                  ? retryError.message
                  : "Retry execution error",
            },
          };
        }
      }
    }

    const response = clarifyResponse(requestId, generation.confidence);
    return {
      response,
      telemetry: {
        ...telemetry,
        mode: response.mode,
        error: error instanceof Error ? error.message : "Execution failed",
      },
    };
  }
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
      error: telemetry.error,
    }),
  );
}

export async function runSqlChatPipelineDetailed(
  input: AiChatRequest,
): Promise<SqlChatPipelineResult> {
  const requestId = createRequestId();
  const model = getModel();
  return attemptSqlPipeline(model, input, requestId);
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
  const requestId = createRequestId();

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
      return {
        reply,
        mode: "answer",
        meta: { requestId },
      };
    }

    return clarifyResponse(requestId);
  }

  const result = await runSqlChatPipelineDetailed(input);
  if (input.debug) {
    logShadowTelemetry(result.telemetry);
  }
  return result.response;
}
