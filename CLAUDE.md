# CLAUDE.md

Dangol CRM 저장소에서 작업할 때 Claude가 따라야 할 맥락과 관례를 정리한 문서.

## 제품 개요

- **Dangol CRM** — 한국 SMB 대상 B2B CRM SaaS (한국어 UI).
- 두 축의 툴이 한 레포에 공존한다:
  - **영업관리 툴** (`dealflow-page.tsx`) — 리드/딜/파이프라인 관리
  - **고객관리 툴** (`customer-page.tsx`) — 기존 고객 라이프사이클/헬스스코어/재계약

## 핵심 차별점 (가장 중요)

이 서비스가 기존 CRM과 다른 이유 — **모든 설계·구현 결정은 이 두 축을 강화하는 방향으로 이루어져야 한다.**

### 1. 각 고객사에 맞는 유연한 커스터마이징
업종·규모·업무 흐름이 제각각인 SMB가 "우리 회사 방식대로" CRM을 쓸 수 있게 한다. 영업관리 툴과 고객관리 툴 **양쪽 모두** 도입 첫날부터 조직에 맞게 구조를 바꿀 수 있어야 한다.

- **스키마가 고정되지 않는다** — `customFields`로 컬럼(필드)을 자유롭게 추가/이름변경/삭제/타입변경/재정렬. 노션 테이블처럼 테이블 안에서 바로 편집(인라인 편집·`+ 행 추가`·`+ 컬럼 추가`·헤더 우클릭 메뉴).
- **빈 테이블 시작 플로우** — 프리셋 컬럼을 강제하지 않고 `startBlankTable()`로 빈 컬럼을 주고 사용자가 자기 용어로 정의하게 한다.
- **파이프라인 단계·옵션·select 값**도 사용자 정의. 엑셀 임포트 시 새 값이 감지되면 "옵션으로 추가?"를 묻는 식으로, 실제 업무 언어에 맞춰 CRM이 커진다.
- **구현 원칙**: 새 기능을 설계할 때 **고정 enum·하드코딩 라벨을 먼저 의심**하고 `customFields`/옵션으로 분해 가능한지 먼저 검토.

### 2. 직관적이고 쉬운 UI/UX
CRM은 보통 학습 곡선이 가파르고 필드가 많아 진입 장벽이 높다. Dangol은 **"설명 없이도 바로 쓸 수 있는 CRM"**을 지향한다.

- **복잡한 용어 추방** — 업계 전문용어 대신 일상 한국어. (예: 퍼널→흐름, 스테이지→단계, 업셀→추가 제안, LTV→누적 매출)
- **노션/엑셀 같은 친숙한 상호작용** — 셀 클릭 편집, 헤더 클릭 이름 변경, `+`로 즉시 확장. 모달·마법사·설정 페이지로 사용자를 밀어내지 않는다.
- **빈 상태 friendly 온보딩** — 무엇을 할 수 있는지 행동 유도(CTA)가 명확하고, 더미 데이터나 숨은 규칙 없이도 스스로 정의해 나갈 수 있어야 한다.
- **기능 밀도 ≠ 복잡도** — 기능이 많더라도 한 번에 한 가지만 보여 주고, 고급 기능은 우클릭·키보드·호버 등 **점진적 노출**로 숨긴다.
- **구현 원칙**: 새 UI를 만들 때 **"초면의 사용자가 어디를 눌러야 하는지 3초 안에 알 수 있는가"**를 기준으로 검토. 문구·placeholder·hover hint로 안내. 불필요한 모달·다이얼로그·중복 진입점(예: "필드"와 "컬럼 설정" 중복)은 통합해 제거.

### 3. AI 에이전트 활용 극대화
CRM의 데이터 입력·정리·분석 부담을 AI가 대신 맡아, 영업/CS 담당자가 "사람이 꼭 해야 하는 일"에만 집중하게 한다.

- **엑셀 → CRM 자동 매핑**: `server/src/services/column-mapping.ts`가 엑셀 컬럼을 CRM 필드(`targetField`)에 매칭. 없는 필드는 AI가 새 `customField`로 제안.
- **위젯/대시보드 추천**: 데이터 형상을 보고 어떤 KPI·차트가 유용할지 AI가 추천 (`recommendWidgets`).
- **앞으로 확장될 영역**: 딜 우선순위 예측, 재계약 리스크 조기 감지, 활동 요약, 자동 메모 작성, 자연어로 대시보드 질의 등 — 에이전트가 CRM을 "조작"하고 "해석"하는 모든 접점.
- **구현 원칙**: AI 기능을 별도 탭/모달로 고립시키지 말고, **기존 워크플로에 에이전트를 끼워 넣는 방향**으로 설계. 사용자가 AI를 "부르러 가는" 게 아니라, AI가 현재 맥락에 제안을 띄우는 형태.

## 기술 스택

- **프론트엔드**: React 19 · TypeScript · Vite 6 · Tailwind v4 · react-router v7 · recharts · react-dnd · lucide-react · xlsx
- **백엔드** (`server/`): Express 4 · Prisma 7.7 · SQLite · JWT (`dangol_access_token`)
- **아이콘 라이브러리**: `lucide-react` (이모지 대신 아이콘 컴포넌트 사용)

## 디렉터리 지도

```
src/app/
  App.tsx
  routes.tsx
  components/
    dealflow-page.tsx      # 영업관리 (~5000+ lines)
    customer-page.tsx      # 고객관리 (~5000+ lines, dealflow 미러)
    field-settings-page.tsx  # 현재 disconnected (필드 매니저 다이얼로그로 통합됨)
    …
  lib/
    excel-import.ts        # 공용 파싱/정규화 헬퍼 + transformRows/FieldMapping
server/src/
  routes/ai.ts             # AI 컬럼 매핑 (targetField 네이밍)
  services/column-mapping.ts
```

## 두 페이지의 병행 구조

`dealflow-page.tsx`와 `customer-page.tsx`는 **의도적으로 거의 동일한 구조**다. 한 쪽을 수정하면 다른 쪽에도 같은 패턴을 적용해야 하는 경우가 많다. 단, **도메인 구분이 필요한 부분**(위젯·활동로그·첨부 타입 등)은 의도적으로 다르다.

- 공통: 필터/정렬/그룹/컬럼 설정/인라인 편집/AddDealModal
- 차이: 위젯 카테고리(영업 KPI vs 고객 헬스), lifecycle 로그(customer 전용), 첨부 카테고리

한쪽만 수정할 땐 **다른 쪽도 수정 필요한지 반드시 검토**. 사용자가 "영업관리 툴에서…" 혹은 "고객관리 툴에서…"로 한정하면 그 파일만 손댄다.

## 핵심 데이터 모델

### CustomField 기반 동적 스키마
두 페이지 모두 `customFields: CustomField[]` 상태로 컬럼 스키마를 관리한다:

```ts
interface CustomField {
  id: string; key: string; label: string;
  type: "text" | "number" | "select" | "multi-select" | "date" | "person" | "phone" | "email" | "file";
  required: boolean; locked: boolean;
  options?: string[]; visible: boolean;
}
```

- **built-in 컬럼**은 `ALL_COLUMNS`(ColumnDef) + `DEFAULT_FIELDS`(CustomField)로 이중 정의된다. `mergedColumns`는 ALL_COLUMNS와 custom extras를 합친다.
- `customFields`의 key가 `ALL_COLUMNS`의 key와 겹치면 custom 쪽은 필터링된다 (built-in 라벨 override 불가).

### Deal / Customer
- 각 페이지에 `interface Deal`·`interface Customer` 정의 (index signature `[key: string]: unknown` 포함 → customField 값 저장용).
- 상태 변수 이름은 두 파일 모두 `customerDeals` (dealflow에서도 변수명은 그대로 — 레거시 네이밍, 섣불리 바꾸지 말 것).

### 공용 엑셀 임포트
- `src/app/lib/excel-import.ts`의 `transformRows`·`FieldMapping`은 두 페이지가 공유.
- AI 컬럼 매핑 서비스(`server/src/services/column-mapping.ts`)는 **`targetField`/`targetFields`** 이름 사용 (domain-neutral). `dealflowField`·`customerField`로 되돌리지 말 것.

## UX 규약

- **한국어 UI 문자열만 쓴다** (영어 혼용 금지, 단 `key`·내부 식별자 제외).
- **이모지 UI 사용 금지** — 단, `FIELD_TYPE_ICONS` 같은 기존 매핑과 사용자가 명시적으로 허용한 예외는 유지.
- **CRM 전문용어 대신 쉬운 한국어** — "딜/수주율/리텐션/업셀/LTV/퍼널/스테이지" → "거래/성공률/유지율/추가 제안/누적 매출/흐름/단계" 등으로 이미 대체됨.
- 색상 토큰: `T.primary = "#1A472A"` (진녹색), `T.border = "#E0E3E8"`. 새 색을 임의로 섞지 말고 기존 팔레트 재사용.

## 작업 관례

- **Typecheck**: `npx tsc --noEmit -p tsconfig.app.json` — 모든 수정 후 실행.
- **Lint**: `npm run lint`. 필요 시에만 수동 호출.
- **Dev 서버**: `npm run dev`는 프론트·백 concurrently 실행.
- **브라우저 테스트 요구**: UI 변경 시 직접 클릭 검증 못 하면 명시적으로 그렇게 보고 (type check만으로 완료 처리 금지).

## 코드 스타일

- `Edit` 툴을 우선 사용. 새 파일 생성은 최대한 지양.
- **주석은 기본적으로 쓰지 않는다**. 다만 비자명한 왜(WHY) — 숨은 제약·워크어라운드 — 는 한 줄 허용.
- `replace_all`은 짧은 식별자에 주의 — substring match 위험. (과거 `dealflowField` replace_all이 `dealflowFields`까지 건드린 사례 있음.)
- 기능 확장 시 **CustomField 스키마를 재활용**하는 것을 우선. 새 스키마 만들기 전에 기존으로 해결 가능한지 확인.

## 파일 규모 & 네비게이션

- 두 페이지 파일이 각각 5000줄 이상. 전체 읽기보다 `Grep`·`Read offset`으로 타겟 검색.
- 자주 쓰는 앵커:
  - `const [customerDeals, setCustomerDeals]` — state 선언 근방에 공용 상태 모여 있음.
  - `activeColumns.map((h) =>` — 테이블 thead 렌더.
  - `activeColumns.map((col) =>` — tbody 셀 렌더.
  - `{showColumnConfig &&` — 통합 필드 매니저 다이얼로그 (구 "컬럼 설정").

## Git 워크플로

- 사용자가 "커밋하고 푸쉬해"라고 명시하면 커밋 + push. 그 전에는 스스로 커밋하지 않는다.
- 커밋 메시지: 짧은 타이틀 + 필요시 본문. **"what"이 아니라 "why"**를 설명. Co-Author 트레일러:

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

- `*.tsbuildinfo`·루트 `*.xlsx`·`*.png`는 `.gitignore`에 들어있음. 새 파일 추가 시 커밋에 끌려 들어가지 않게 주의.
- force push·브랜치 삭제·`git add -A` 같은 파괴적/광범위 작업은 명시 승인 전 금지.

## 현재 상태 스냅샷

- **인라인 테이블 편집 (Notion 스타일)** 구현 완료: 셀 단일·더블클릭 편집, `+ 행 추가` 푸터, 헤더 `+` 컬럼 추가 popover, 헤더 우클릭 rename/숨기기/삭제, select 컬럼 옵션 자동 추가 확인.
- **빈 테이블 시작** 플로우: `startBlankTable()`이 기본 컬럼 숨기고 커스텀 컬럼만 보이게 하는 "scratch" 모드.
- **영업관리**의 "필드" 버튼은 통합 필드 매니저 다이얼로그를 연다 (구 `/settings/fields` 페이지는 현재 연결 안 됨, 추후 정리 대상).
- 고객관리에는 아직 같은 통합 적용 안 됨 — 사용자 요청 오면 동일 패턴으로 복제.
