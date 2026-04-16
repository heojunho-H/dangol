// ─────────────────────────────────────────────────────────────
// Dangol CRM · AI 엑셀 컬럼 매핑 Edge Function
// 엑셀 컬럼 목록 + 기존 필드 목록을 받아 map / create 결정.
// 요청: { excelColumns: {name, preview, samples?}[], targetFields: {name, required}[] }
// 응답: { mappings: [...], newFields: [...] }
// 인증: verify_jwt = true (authenticated 유저만)
// ─────────────────────────────────────────────────────────────

import { callClaude, parseJsonResponse, CORS_HEADERS, jsonResponse } from "../_shared/claude.ts";

const SYSTEM_PROMPT = `당신은 한국 B2B CRM 도메인 전문가입니다.
사용자가 올린 엑셀의 각 컬럼을, 우리 서비스의 기존 필드에 **매핑**하거나 **새 커스텀 필드로 생성**할지 판단합니다.

## 핵심 원칙
- 서비스 목표: 사용자가 어떤 엑셀을 올려도 그 엑셀 구조 그대로 수용합니다.
- 기존 필드와 **의미가 확실히 겹치면** map, 아니면 모두 create (즉, 손실 없이 전부 가져갑니다).
- 확실하지 않으면 create 를 선호하세요 (기존 필드를 억지로 끼워맞추지 않음).

## 두 가지 액션

### action: "map" — 기존 필드에 매핑
- 엑셀 컬럼명과 기존 필드명이 동의어/유의어이고, 샘플 데이터 패턴이 일치할 때
- confidence 0.7 이상만 map 으로 처리
- 예: "회사명" → "기업명", "대표전화" → "전화번호", "등록일" → "등록일"

### action: "create" — 새 커스텀 필드로 생성
- 의미가 애매하거나 기존 필드에 없는 개념 → 엑셀 컬럼을 **그대로 새 필드**로 생성
- newField.type 을 샘플 데이터에서 추론:
  - text: 일반 텍스트 (회사명, 이름, 주소)
  - number: 정수 (직원수, 수량, 연도)
  - amount: 금액 (연매출, 견적, 가격 — "₩", "만", "억", 숫자+단위)
  - date: 날짜 (YYYY-MM-DD, 2026년3월)
  - phone: 전화번호 (010-xxxx, 02-xxx)
  - email: 이메일 (@)
  - select: 제한된 카테고리 (3~10개 반복되는 값, 예: "S/A/B 등급", "서울/경기/인천", "소프트웨어/IT/제조")
  - person: 사람 이름 (담당자 같은 성격)
- select 로 판단하면 samples 에서 **고유값을 suggestedOptions 로 추출** (최대 10개)
- 필드 라벨은 엑셀 컬럼명을 그대로 사용 (괄호/단위 포함 OK)

## 출력 규칙
- 모든 엑셀 컬럼이 결과에 포함되어야 합니다 (빠뜨리지 마세요).
- 반드시 아래 JSON 형식으로만 응답 (다른 텍스트 없이):

{
  "columns": [
    {
      "excelColumn": "엑셀 컬럼명",
      "action": "map" | "create",
      "confidence": 0.0~1.0,
      "reason": "판단 근거 (한국어, 30자 이내)",
      "targetField": "기업명",
      "newField": {
        "type": "text"|"number"|"amount"|"date"|"phone"|"email"|"select"|"person",
        "suggestedOptions": ["S","A","B"]
      }
    }
  ]
}`;

interface Req {
  excelColumns: { name: string; preview: string; samples?: string[] }[];
  targetFields: { name: string; required: boolean }[];
}

interface ColAnalysis {
  excelColumn: string;
  action: "map" | "create";
  confidence: number;
  reason: string;
  targetField?: string;
  newField?: {
    type: "text" | "number" | "amount" | "date" | "phone" | "email" | "select" | "person";
    suggestedOptions?: string[];
  };
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

  if (!Array.isArray(body.excelColumns) || !Array.isArray(body.targetFields)) {
    return jsonResponse(400, { error: "excelColumns와 targetFields는 배열이어야 합니다" });
  }

  const userMessage = `다음 엑셀 컬럼들을 분석해서 기존 필드에 매핑하거나 새 커스텀 필드로 생성해주세요.

## 엑셀 컬럼 (이름 + 샘플 데이터)
${body.excelColumns
  .map((c) => {
    const samples = c.samples && c.samples.length > 0 ? c.samples : [c.preview];
    return `- "${c.name}" → 샘플: ${samples.slice(0, 10).map((s) => `"${s}"`).join(", ")}`;
  })
  .join("\n")}

## 기존 필드
${body.targetFields.map((f) => `- "${f.name}" (${f.required ? "필수" : "선택"})`).join("\n")}

반드시 엑셀 컬럼 **모두** 를 columns 배열에 포함시키세요 (map 또는 create).`;

  try {
    const text = await callClaude({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const parsed = parseJsonResponse(text) as { columns: ColAnalysis[] };
    if (!parsed.columns || !Array.isArray(parsed.columns)) {
      return jsonResponse(502, { error: "잘못된 응답 형식: columns 배열이 필요합니다" });
    }

    const mappings: { excelColumn: string; targetField: string; confidence: number; reason: string }[] = [];
    const newFields: { excelColumn: string; type: string; suggestedOptions?: string[]; confidence: number; reason: string }[] = [];

    for (const c of parsed.columns) {
      if (c.action === "map" && c.targetField) {
        mappings.push({
          excelColumn: c.excelColumn,
          targetField: c.targetField,
          confidence: c.confidence,
          reason: c.reason,
        });
      } else if (c.action === "create" && c.newField) {
        newFields.push({
          excelColumn: c.excelColumn,
          type: c.newField.type,
          suggestedOptions: c.newField.suggestedOptions,
          confidence: c.confidence,
          reason: c.reason,
        });
      }
    }

    return jsonResponse(200, { mappings, newFields });
  } catch (err) {
    console.error("[ai-column-mapping]", err);
    return jsonResponse(500, { error: (err as Error).message });
  }
});
