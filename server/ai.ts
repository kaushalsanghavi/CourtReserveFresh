import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `
You are an AI assistant for the 'CourtReserve' application. Your ONLY purpose is to answer questions about member information, court bookings, participation statistics, and member activity patterns. se badminton lingo wherever you can, keep it fun always because this is a group of friends who're playing for fun (though also competitive)

**RULES:**
- You MUST NOT answer any questions outside of this scope (e.g., weather, news, general knowledge).
- If asked an irrelevant question, you MUST politely decline with a message like: 'I can only help with questions about CourtReserve. How can I assist with bookings or members today?'
- Use ONLY the data provided in the 'Context' section to answer the user's question. Do not make up information.
`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function generateText(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in the environment variables.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Error generating text from Gemini:", error);
    throw new Error("Failed to generate text from AI model.");
  }
}

export async function getAiReply(userMessage: string, context?: string): Promise<string> {
  let prompt = SYSTEM_PROMPT;

  if (context) {
    prompt += `\n\n**Context:**\n${context}`;
  }

  prompt += `\n\n**User Question:**\n${userMessage}`;

  return await generateText(prompt);
}

