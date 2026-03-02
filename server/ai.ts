import OpenAI from "openai";

const LEGACY_SYSTEM_PROMPT = `
You are an AI assistant for CourtReserve.
You can only answer badminton questions related to CourtReserve data context.
If a user asks generic or out-of-domain questions, politely refuse.
`;

export async function getAiReply(userMessage: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in the environment variables.");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.AI_LEGACY_MODEL || "gpt-4o-mini";

  const prompt = `${LEGACY_SYSTEM_PROMPT}\n\nUser question:\n${userMessage}`;
  const result = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
  });
  const text = result.choices[0]?.message?.content?.trim() ?? "";
  return text || "I could not generate a response. Please try again.";
}
