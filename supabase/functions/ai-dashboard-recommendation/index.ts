// ─────────────────────────────────────────────────────────────
// Dangol CRM · AI 대시보드 위젯 추천 Edge Function
// 딜 데이터 + 사용 가능한 위젯 목록을 받아 시나리오 분류 + 위젯 추천.
// 요청: { deals: unknown[], availableWidgets: {id, name, category}[] }
// 응답: { scenario, analysis, recommendations }
// 인증: verify_jwt = true
// ─────────────────────────────────────────────────────────────

import { callClaude, parseJsonResponse, CORS_HEADERS, jsonResponse } from "../_shared/claude.ts";

const SYSTEM_PROMPT = `당신은 한국 B2B CRM 대시보드 컨설턴트입니다.
딜(영업 기회) 데이터를 분석하여 최적의 대시보드 위젯 구성을 추천합니다.

## 분석 항목
1. **팀 규모 판단**: 담당자 수, 딜 건수로 팀 시나리오 분류
   - "소규모 팀": 담당자 5명 이하, 딜 20건 이하 → 개별 딜 추적 중심
   - "중규모 팀": 담당자 5명 초과 또는 딜 20건 초과 → 팀 성과 비교 중심
   - "단순 고객 목록": 금액 데이터 없음 → 고객 관리 중심
2. **데이터 특성 분석**: 금액 분포, 스테이지 다양성, 수주율, 기간 범위, 서비스 다양성
3. **위젯 추천**: 데이터 특성에 맞는 위젯을 6~8개 추천, 각각 추천 이유와 우선순위(0~100) 포함
   - **우선순위 기준 (엄격히 지키세요)**:
     - 85~100: 이 데이터/팀에게 **반드시 필요한 핵심 위젯** (3~5개 이내)
     - 70~84: 있으면 확실히 유용한 보조 위젯
     - 50~69: 상황에 따라 도움되는 참고용 위젯
   - 사용자 화면은 85 이상만 기본 선택되므로, 시선이 가장 먼저 가야 할 "필수" 지표에만 85+ 를 부여하세요

## 출력 규칙
- scenario.type은 "소규모 팀", "중규모 팀", "단순 고객 목록" 중 하나
- widgetId는 반드시 availableWidgets의 id 중에서만 선택
- 모든 텍스트는 한국어로 작성
- 반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):

{
  "scenario": { "type": "시나리오명", "reason": "판단 근거" },
  "analysis": {
    "totalDeals": 0, "uniqueStages": 0, "uniqueManagers": 0,
    "hasAmountData": true, "winRate": 0.0, "dateRangeSpanDays": 0,
    "totalAmount": 0, "serviceCount": 0, "hasManagerData": true
  },
  "recommendations": [
    { "widgetId": "위젯ID", "reason": "추천 근거", "priority": 100 }
  ]
}`;

interface Req {
  deals: Record<string, unknown>[];
  availableWidgets: { id: string; name: string; category: string }[];
}

interface Resp {
  scenario: { type: string; reason: string };
  analysis: Record<string, unknown>;
  recommendations: { widgetId: string; reason: string; priority: number }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse(405, { error: "POST만 허용됩니다" });

  let body: Req;
  try {
    body = await req.json() as Req;
  } catch {
    return jsonResponse(400, { error: "JSON 파싱 실패" });
  }

  if (!Array.isArray(body.deals) || !Array.isArray(body.availableWidgets)) {
    return jsonResponse(400, { error: "deals와 availableWidgets는 배열이어야 합니다" });
  }

  const userMessage = `다음 딜 데이터를 분석하여 대시보드 위젯을 추천해주세요.

## 딜 데이터 (${body.deals.length}건)
${JSON.stringify(body.deals, null, 2)}

## 사용 가능한 위젯 목록
${body.availableWidgets.map((w) => `- id: "${w.id}", name: "${w.name}", category: "${w.category}"`).join("\n")}`;

  try {
    const text = await callClaude({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const parsed = parseJsonResponse(text) as Resp;
    if (!parsed.scenario || !parsed.recommendations) {
      return jsonResponse(502, { error: "잘못된 응답 형식: scenario와 recommendations가 필요합니다" });
    }

    const validIds = new Set(body.availableWidgets.map((w) => w.id));
    parsed.recommendations = parsed.recommendations.filter((r) => validIds.has(r.widgetId));

    return jsonResponse(200, parsed);
  } catch (err) {
    console.error("[ai-dashboard-recommendation]", err);
    return jsonResponse(500, { error: (err as Error).message });
  }
});
