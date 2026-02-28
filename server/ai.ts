import { GoogleGenerativeAI } from "@google/generative-ai";

const LEGACY_SYSTEM_PROMPT = `
You are an AI assistant for CourtReserve.
You can only answer badminton questions related to CourtReserve data context.
If a user asks generic or out-of-domain questions, politely refuse.
`;

export async function getAiReply(userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment variables.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.AI_LEGACY_MODEL || "gemini-1.5-flash",
  });

  const prompt = `${LEGACY_SYSTEM_PROMPT}\n\nUser question:\n${userMessage}`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return text || "I could not generate a response. Please try again.";
}
