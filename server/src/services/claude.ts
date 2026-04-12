import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  }
  return client;
}

/**
 * Parse JSON from Claude response text.
 * Tries direct parse first, then extracts from code fences.
 */
export function parseJsonResponse(text: string): unknown {
  // Direct parse
  try {
    return JSON.parse(text);
  } catch {
    // ignore
  }
  // Extract from code fences
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      // ignore
    }
  }
  // Try to find JSON object/array in text
  const jsonMatch = text.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // ignore
    }
  }
  throw new Error("Claude 응답을 JSON으로 파싱할 수 없습니다");
}
