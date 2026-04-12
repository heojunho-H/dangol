import { getClient, parseJsonResponse } from "./claude.js";

const SYSTEM_PROMPT = `당신은 한국 B2B 영업/CRM 도메인 전문가입니다.
사용자가 올린 엑셀의 각 컬럼을, 우리 서비스의 기존 딜플로우 필드에 **매핑**하거나 **새 커스텀 필드로 생성**할지 판단합니다.

## 핵심 원칙
- 서비스 목표: 사용자가 어떤 엑셀을 올려도 그 엑셀 구조 그대로 수용합니다.
- 기존 필드와 **의미가 확실히 겹치면** map, 아니면 모두 create (즉, 손실 없이 전부 가져갑니다).
- 확실하지 않으면 create 를 선호하세요 (기존 필드를 억지로 끼워맞추지 않음).

## 두 가지 액션

### action: "map" — 기존 딜플로우 필드에 매핑
- 엑셀 컬럼명과 딜플로우 필드명이 동의어/유의어이고, 샘플 데이터 패턴이 일치할 때
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
      "dealflowField": "기업명",              // action="map"일 때만
      "newField": {                           // action="create"일 때만
        "type": "text"|"number"|"amount"|"date"|"phone"|"email"|"select"|"person",
        "suggestedOptions": ["S","A","B"]    // type="select"일 때만
      }
    }
  ]
}

## Few-shot 예시

### 예시 1 (명확한 매핑)
엑셀: "회사명" (샘플: "(주)테크노바", "스마트솔루션즈")
딜플로우 필드: "기업명"(필수), "전화번호"(선택), ...
출력: {"excelColumn":"회사명","action":"map","confidence":0.98,"reason":"동의어 관계 확실","dealflowField":"기업명"}

### 예시 2 (새 필드 - select 타입)
엑셀: "등급" (샘플: "A","B","S","A","B","S","B")
딜플로우 필드 중 매칭 없음
출력: {"excelColumn":"등급","action":"create","confidence":0.95,"reason":"카테고리형 값 반복","newField":{"type":"select","suggestedOptions":["S","A","B"]}}

### 예시 3 (새 필드 - amount)
엑셀: "연매출(억원)" (샘플: "85", "32", "420")
기존 필드에 "견적금액" 있음 — 의미 다름 (매출≠견적)
출력: {"excelColumn":"연매출(억원)","action":"create","confidence":0.9,"reason":"매출은 견적과 의미 다름 - 보존","newField":{"type":"amount"}}

### 예시 4 (새 필드 - number)
엑셀: "직원수" (샘플: "120", "45", "350")
매칭 필드 없음
출력: {"excelColumn":"직원수","action":"create","confidence":0.95,"reason":"정수 값 - 기존 필드에 없음","newField":{"type":"number"}}

### 예시 5 (애매한 경우 - create 선호)
엑셀: "대표자" (샘플: "김정훈", "이미영")
딜플로우 필드: "담당자"(고객측 접점)
출력: {"excelColumn":"대표자","action":"create","confidence":0.85,"reason":"대표이사≠담당자 - 의미 다름","newField":{"type":"person"}}

### 예시 6 (새 필드 - text URL)
엑셀: "웹사이트" (샘플: "www.technova.co.kr")
출력: {"excelColumn":"웹사이트","action":"create","confidence":0.95,"reason":"URL - 기존 필드 없음","newField":{"type":"text"}}

### 예시 7 (새 필드 - date)
엑셀: "설립연도" (샘플: "2015", "2018", "2005")
출력: {"excelColumn":"설립연도","action":"create","confidence":0.9,"reason":"연도만 있음 - 정수로 저장","newField":{"type":"number"}}`;

interface ColumnAnalysisRequest {
  excelColumns: { name: string; preview: string; samples?: string[] }[];
  dealflowFields: { name: string; required: boolean }[];
}

interface ColumnAnalysisResult {
  excelColumn: string;
  action: "map" | "create";
  confidence: number;
  reason: string;
  dealflowField?: string;
  newField?: {
    type:
      | "text"
      | "number"
      | "amount"
      | "date"
      | "phone"
      | "email"
      | "select"
      | "person";
    suggestedOptions?: string[];
  };
}

interface ColumnAnalysisResponse {
  columns: ColumnAnalysisResult[];
}

type NewFieldType = NonNullable<ColumnAnalysisResult["newField"]>["type"];

interface MappingResult {
  excelColumn: string;
  dealflowField: string;
  confidence: number;
  reason: string;
}

interface NewFieldResult {
  excelColumn: string;
  type: NewFieldType;
  suggestedOptions?: string[];
  confidence: number;
  reason: string;
}

export interface ColumnMappingResponse {
  mappings: MappingResult[];
  newFields: NewFieldResult[];
}

export async function mapColumns(
  req: ColumnAnalysisRequest
): Promise<ColumnMappingResponse> {
  const userMessage = `다음 엑셀 컬럼들을 분석해서 기존 딜플로우 필드에 매핑하거나 새 커스텀 필드로 생성해주세요.

## 엑셀 컬럼 (이름 + 샘플 데이터)
${req.excelColumns
  .map((c) => {
    const samples = c.samples && c.samples.length > 0 ? c.samples : [c.preview];
    const sampleText = samples
      .slice(0, 10)
      .map((s) => `"${s}"`)
      .join(", ");
    return `- "${c.name}" → 샘플: ${sampleText}`;
  })
  .join("\n")}

## 기존 딜플로우 필드
${req.dealflowFields
  .map((f) => `- "${f.name}" (${f.required ? "필수" : "선택"})`)
  .join("\n")}

반드시 엑셀 컬럼 **모두** 를 columns 배열에 포함시키세요 (map 또는 create).`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = parseJsonResponse(text) as ColumnAnalysisResponse;

  // Validate structure
  if (!parsed.columns || !Array.isArray(parsed.columns)) {
    throw new Error("잘못된 응답 형식: columns 배열이 필요합니다");
  }

  const mappings: MappingResult[] = [];
  const newFields: NewFieldResult[] = [];

  for (const c of parsed.columns) {
    if (c.action === "map" && c.dealflowField) {
      mappings.push({
        excelColumn: c.excelColumn,
        dealflowField: c.dealflowField,
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

  return { mappings, newFields };
}
