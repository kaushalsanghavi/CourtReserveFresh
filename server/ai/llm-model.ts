export interface LlmResponse {
  response: {
    text(): string;
  };
}

export interface LlmModel {
  generateContent(prompt: string): Promise<LlmResponse>;
}
