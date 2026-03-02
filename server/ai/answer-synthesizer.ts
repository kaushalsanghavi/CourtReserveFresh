import type { LlmModel } from "./llm-model.js";

export interface SynthesizeAnswerInput {
  question: string;
  rows: Record<string, unknown>[];
}

export async function synthesizeAnswerFromRows(
  model: LlmModel,
  input: SynthesizeAnswerInput,
): Promise<string> {
  const { question, rows } = input;

  if (rows.length === 0) {
    return "No badminton-related records were found in CourtReserve for that question";
  }

  const prompt = `
You are the CourtReserve badminton assistant.

You must follow these rules:
- Answer only using the SQL result rows provided below.
- If rows do not contain enough information, explicitly say that.
- Do not add facts outside the rows.
- Keep the tone concise and badminton-friendly.

User question:
${question}

SQL result rows (JSON):
${JSON.stringify(rows, null, 2)}
`;

  const result = await model.generateContent(prompt);
  const answer = result.response.text().trim();
  return answer || "I could not generate a grounded answer from the available rows.";
}
