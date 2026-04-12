import { getClient, parseJsonResponse } from "./claude.js";

const SYSTEM_PROMPT = `당신은 한국 B2B 영업/CRM 도메인 전문가입니다.
엑셀 컬럼과 딜플로우(CRM) 필드 간의 매핑을 분석합니다.

## 분석 기준
1. **컬럼명 유사도**: 한국어 비즈니스 용어의 동의어/유의어 관계를 파악합니다.
   - 예: "회사명" = "기업명" = "업체명" = "고객사"
   - 예: "영업담당" = "담당자" = "매니저" = "고객책임자"
   - 예: "금액" = "견적금액" = "가격" = "비용" = "매출액"
   - 예: "상태" = "진행상태" = "단계" = "스테이지"
   - 예: "연락처" = "전화번호" = "휴대폰"
   - 예: "등록일자" = "문의 등록일" = "날짜" = "생성일"
2. **데이터 패턴 분석**: 샘플 데이터의 형식을 분석합니다.
   - 전화번호 패턴: 010-XXXX-XXXX, 02-XXX-XXXX
   - 이메일 패턴: xxx@xxx.xx
   - 금액 패턴: 숫자, ₩ 기호, 만/억 단위
   - 날짜 패턴: YYYY-MM-DD, YYYY/M/D, YYYY년 M월 D일
3. **신뢰도 점수**: 0.0~1.0 범위
   - 0.8 이상: 자동 매핑 (매우 확실)
   - 0.4~0.8: 확인 필요 (가능성 높지만 사용자 확인 권장)
   - 0.4 미만: 매핑 불가 (제외)
4. **동명이인 구분**: "담당자"(엑셀)는 맥락에 따라 "담당자명"(고객측 담당자) 또는 "고객책임자"(영업 담당자)에 매핑됩니다. 샘플 데이터를 보고 판단하세요.

## 출력 규칙
- 하나의 엑셀 컬럼은 최대 하나의 딜플로우 필드에만 매핑
- 하나의 딜플로우 필드에는 최대 하나의 엑셀 컬럼만 매핑
- 신뢰도 0.2 미만인 매핑은 제외
- reason은 반드시 한국어로 간결하게 작성 (30자 이내 권장)
- 반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):

{
  "mappings": [
    {
      "excelColumn": "엑셀 컬럼명",
      "dealflowField": "딜플로우 필드명",
      "confidence": 0.95,
      "reason": "매핑 근거 설명 (한국어)"
    }
  ]
}

## Few-shot 예시

### 예시 1
입력:
- 엑셀 컬럼: "업체명" (샘플: "(주)엔터프라이즈", "한국데이터㈜", "스마트시스템")
- 딜플로우 필드: "기업명" (필수)

출력: {"excelColumn":"업체명","dealflowField":"기업명","confidence":0.98,"reason":"동의어 관계 + 회사명 패턴 확실"}

### 예시 2
입력:
- 엑셀 컬럼: "예상매출" (샘플: "3,200만원", "₩85,000,000", "1.2억")
- 딜플로우 필드: "견적금액" (선택)

출력: {"excelColumn":"예상매출","dealflowField":"견적금액","confidence":0.92,"reason":"금액 패턴 + 의미 유사 (매출≈견적)"}

### 예시 3
입력:
- 엑셀 컬럼: "Phone" (샘플: "010-1234-5678", "02-555-1234")
- 딜플로우 필드: "전화번호" (선택)

출력: {"excelColumn":"Phone","dealflowField":"전화번호","confidence":0.95,"reason":"전화번호 패턴 100% 일치"}

### 예시 4 (애매한 경우)
입력:
- 엑셀 컬럼: "담당" (샘플: "김철수", "이영희")
- 딜플로우 필드 후보: "담당자명" (고객측 담당자), "고객책임자" (영업 담당자)

출력: {"excelColumn":"담당","dealflowField":"담당자명","confidence":0.5,"reason":"컨텍스트 불명 - 사용자 확인 권장"}`;

interface ColumnMappingRequest {
  excelColumns: { name: string; preview: string; samples?: string[] }[];
  dealflowFields: { name: string; required: boolean }[];
}

interface MappingResult {
  excelColumn: string;
  dealflowField: string;
  confidence: number;
  reason: string;
}

interface ColumnMappingResponse {
  mappings: MappingResult[];
}

export async function mapColumns(
  req: ColumnMappingRequest
): Promise<ColumnMappingResponse> {
  const userMessage = `다음 엑셀 컬럼들을 딜플로우 필드에 매핑해주세요.

## 엑셀 컬럼 (이름 + 샘플 데이터)
${req.excelColumns
  .map((c) => {
    const samples = c.samples && c.samples.length > 0 ? c.samples : [c.preview];
    const sampleText = samples
      .slice(0, 5)
      .map((s) => `"${s}"`)
      .join(", ");
    return `- "${c.name}" → 샘플: ${sampleText}`;
  })
  .join("\n")}

## 딜플로우 필드
${req.dealflowFields.map((f) => `- "${f.name}" (${f.required ? "필수" : "선택"})`).join("\n")}`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = parseJsonResponse(text) as ColumnMappingResponse;

  // Validate structure
  if (!parsed.mappings || !Array.isArray(parsed.mappings)) {
    throw new Error("잘못된 응답 형식: mappings 배열이 필요합니다");
  }

  return parsed;
}
