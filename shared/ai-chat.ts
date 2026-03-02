import { z } from "zod";

export const AI_CHAT_MAX_MESSAGE_LENGTH = 2000;

export const aiChatRequestSchema = z.object({
  message: z.string().min(1).max(AI_CHAT_MAX_MESSAGE_LENGTH),
  clientTimeZone: z.string().min(1).max(100).optional(),
  debug: z.boolean().optional(),
  requestId: z.string().min(1).max(100).optional(),
});

export type AiChatRequest = z.infer<typeof aiChatRequestSchema>;

export const aiChatModeSchema = z.enum(["answer", "refusal", "clarify"]);
export type AiChatMode = z.infer<typeof aiChatModeSchema>;

export const scopeDecisionSchema = z.enum([
  "IN_SCOPE",
  "BORDERLINE",
  "OUT_OF_SCOPE_CLEAR",
]);
export type ScopeDecision = z.infer<typeof scopeDecisionSchema>;

export const aiChatResponseSchema = z.object({
  reply: z.string(),
  mode: aiChatModeSchema,
  meta: z
    .object({
      requestId: z.string(),
      confidence: z.number().min(0).max(1).optional(),
      decisionSummary: z.string().optional(),
      trace: z
        .object({
          scopeDecision: scopeDecisionSchema.optional(),
          intent: z.string().optional(),
          sql: z.string().optional(),
          validationOutcome: z.enum(["passed", "failed", "skipped"]).optional(),
          rowCount: z.number().int().min(0).optional(),
          execMs: z.number().int().min(0).optional(),
          fallbackReason: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type AiChatResponse = z.infer<typeof aiChatResponseSchema>;

export const sqlGenerationSchema = z.object({
  sql: z.string().min(1),
  intent: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type SqlGeneration = z.infer<typeof sqlGenerationSchema>;
