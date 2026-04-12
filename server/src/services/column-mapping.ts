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
2. **데이터 패턴 분석**: 미리보기 데이터의 형식을 분석합니다.
   - 전화번호 패턴: 010-XXXX-XXXX, 02-XXX-XXXX
   - 이메일 패턴: xxx@xxx.xx
   - 금액 패턴: 숫자, ₩ 기호, 만/억 단위
   - 날짜 패턴: YYYY-MM-DD
3. **신뢰도 점수**: 0.0~1.0 범위
   - 0.8 이상: 자동 매핑 (매우 확실)
   - 0.4~0.8: 확인 필요 (가능성 높지만 사용자 확인 권장)
   - 0.4 미만: 매핑 불가 (제외)

## 출력 규칙
- 하나의 엑셀 컬럼은 최대 하나의 딜플로우 필드에만 매핑
- 하나의 딜플로우 필드에는 최대 하나의 엑셀 컬럼만 매핑
- 신뢰도 0.2 미만인 매핑은 제외
- reason은 반드시 한국어로 간결하게 작성
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
}`;

interface ColumnMappingRequest {
  excelColumns: { name: string; preview: string }[];
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
${req.excelColumns.map((c) => `- "${c.name}" → 샘플: "${c.preview}"`).join("\n")}

## 딜플로우 필드
${req.dealflowFields.map((f) => `- "${f.name}" (${f.required ? "필수" : "선택"})`).join("\n")}`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
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
