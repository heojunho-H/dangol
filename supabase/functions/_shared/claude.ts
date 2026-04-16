// ─────────────────────────────────────────────────────────────
// Dangol CRM · Claude API helper (Edge Functions 공용)
// Anthropic Messages API 직호출. SDK 의존 없이 fetch 로만.
// ─────────────────────────────────────────────────────────────

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export interface MessagesRequest {
  model: string;
  max_tokens: number;
  temperature?: number;
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

export interface MessagesResponse {
  content: { type: "text"; text: string }[];
}

export async function callClaude(req: MessagesRequest): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 300)}`);
  }

  const body = (await res.json()) as MessagesResponse;
  const first = body.content?.[0];
  return first && first.type === "text" ? first.text : "";
}

// JSON 응답 파서: 직접 파싱 → 코드펜스 추출 → 첫 중괄호 블록 순.
export function parseJsonResponse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch { /* pass */ }

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1]);
    } catch { /* pass */ }
  }

  const obj = text.match(/(\{[\s\S]*\})/);
  if (obj) {
    try {
      return JSON.parse(obj[1]);
    } catch { /* pass */ }
  }

  throw new Error("Claude 응답을 JSON으로 파싱할 수 없습니다");
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Max-Age": "86400",
};

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
