# Dangol CRM 백엔드 상세 기획 (Supabase 전면 채택)

---

## 0. 기획 원칙

1. **서비스 핵심 3축**(유연한 커스터마이징·직관 UI·AI 에이전트)에 직결된 백엔드만.
2. **Supabase를 최대한 활용** — Auth·Postgres·RLS·Storage·Edge Function으로 자체 구현을 대체.
3. **Express는 Claude API 프록시로만 축소**. 14개 CRUD 라우트는 전부 삭제.
4. **테넌트 격리는 RLS로 DB 레벨 강제**. 한 줄이라도 빠지면 유출이므로 미들웨어 수준 방어 포기.
5. **JSON 필드는 `jsonb`** — FE 전역 `JSON.parse` 반복 제거, GIN 인덱스 가능.

---

## 1. 최종 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│  React 19 FE (Vite, TanStack Query, supabase-js)            │
└──────┬───────────────────────────────────────┬──────────────┘
       │ 세션 JWT                              │ 세션 JWT
       ▼                                       ▼
┌──────────────────────┐              ┌──────────────────────┐
│ Supabase             │              │ Express AI Proxy     │
│ ├ Auth (signUp/in)   │              │ ├ /api/ai/column-map │
│ ├ Postgres + RLS     │              │ ├ /api/ai/widgets    │
│ ├ Storage            │              │ ├ /api/ai/chat       │
│ ├ Edge Function      │              │ └ ai_usage_logs 기록 │
│ │  (공개 폼 submit)  │              └──────────┬───────────┘
│ └ Triggers/Functions │                         │
└─────┬────────────────┘                         │
      │                                          │ Anthropic SDK
      │                                          ▼
      └─────── Postgres ─────── Claude API ──────┘
```

- **FE → Supabase 직결**: Deal/Customer/CustomField 등 전 CRUD는 supabase-js로.
- **FE → Express**: AI 호출 3개만. Claude 키 보호 + 사용량 메터링.
- **Public 웹폼 submit**: Supabase Edge Function 1개로 처리 (Express 완전 제거 가능).

---

## 2. 기술 스택 확정

| 영역 | 채택 |
|---|---|
| DB | Supabase Postgres 15 (ap-northeast-2 서울) |
| Auth | Supabase Auth — email/password, 이메일 확인 off(베타) |
| 파일 | Supabase Storage (`attachments` 비공개, `avatars` 공개) |
| 격리 | Postgres RLS (`auth.uid()` → `memberships` → `workspace_id`) |
| AI 서버 | Express 4 (슬림화, AI 3개 라우트만) |
| AI SDK | `@anthropic-ai/sdk` |
| FE 클라이언트 | `@supabase/supabase-js` v2 + TanStack Query v5 |
| 배포 | FE: Cloudflare Pages / Vercel · AI 서버: Fly.io 또는 Render |
| 관측 | Supabase 로그 + Sentry(FE·서버) |

**버릴 의존성** (`server/package.json`): `@prisma/client`, `prisma`, `bcrypt`, `jsonwebtoken`, `multer`, `better-sqlite3`.

---

## 3. 데이터 모델 (Postgres 스키마 최종안)

### 3.1 테넌시

```sql
create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table memberships (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role         text not null default 'MEMBER',  -- OWNER/ADMIN/MEMBER
  created_at   timestamptz default now(),
  unique (user_id, workspace_id)
);
create index on memberships (user_id);
create index on memberships (workspace_id);
```

→ Supabase `auth.users`를 직접 참조. 별도 `User` 테이블 없음.

### 3.2 스키마 리소스 (커스터마이즈의 핵)

```sql
create table pipeline_stages (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  color        text default '#3B82F6',
  type         text default 'ACTIVE',   -- ACTIVE/WON/LOST
  sort_order   int default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table customer_lifecycle_stages (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  color        text default '#3B82F6',
  type         text default 'ACTIVE',   -- ONBOARDING/ACTIVE/DORMANT/CHURNED
  sort_order   int default 0
);

create table custom_fields (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  scope        text not null,           -- 'deal' | 'customer'  (★ 두 툴 분리)
  key          text not null,           -- immutable after creation
  label        text not null,
  type         text not null,           -- text/number/select/multi-select/date/person/phone/email/file
  required     bool default false,
  options      jsonb default '[]',      -- [{value, label, archived?}] for select
  visible      bool default true,
  sort_order   int default 0,
  deleted_at   timestamptz,             -- soft delete (§3.2b)
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (workspace_id, scope, key)
);
create index on custom_fields (workspace_id, scope) where deleted_at is null;

create table saved_views (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  scope         text not null,           -- 'deal' | 'customer'
  name          text not null,
  view_type     text not null,           -- table/kanban/timeline
  filters       jsonb default '[]',
  sorts         jsonb default '[]',
  group_by      text default '',
  search_query  text default '',
  column_config jsonb default '[]'       -- ★ 뷰별 컬럼 표시/순서/너비
);
```

**변경 포인트**:
- 현재 Prisma `CustomField`는 workspace 단위 1세트였는데, **영업·고객 툴이 서로 다른 필드 세트를 원하므로 `scope` 컬럼 추가**. 두 페이지 미러 구조를 백엔드에서도 정합성 있게 유지.
- **`saved_views.column_config`** — 같은 테이블을 뷰마다 다른 컬럼 세트·순서·너비로 볼 수 있어야 함(노션 스타일). 예: `[{ key: 'company', visible: true, width: 200, order: 0 }, ...]`.
- **built-in 필드는 `custom_fields`에 seed하지 않음** — FE `ALL_COLUMNS`가 단일 진실. `custom_fields` 테이블은 **순수 사용자 추가 필드만** 담는다. 이렇게 해야 built-in 라벨 변경이 코드·DB 양쪽에서 어긋나지 않음.

### 3.2b 필드 라이프사이클 규약 (커스터마이징 SaaS 핵심)

사용자가 **운영 중에** 필드를 바꿀 때 기존 데이터 처리 규약. 이 규약이 없으면 사고 빈발 지점.

| 행위 | 규약 |
|---|---|
| **label 변경** | 자유. `custom_field_values`에 영향 없음. |
| **key 변경** | **금지** (UI에서 막음). 내부 key는 immutable. 정말 필요하면 관리자 RPC `rename_custom_field_key()`로만. |
| **type 변경** | 확대 변경만 허용(예: `text→select`, `number→text`). 축소는 경고 + 캐스팅 실패 값 `null`. DB 함수 `migrate_field_type(workspace_id, key, new_type)`로 일괄 처리. |
| **options 추가** | 자유. |
| **options 제거** | 제거하려는 옵션이 기존 row에 쓰이면 카운트 경고 → 사용자 선택: (a) soft archive(드롭다운에서 숨김·기존 값 유지) (b) 해당 값 `null` 처리 (c) 취소. 기본은 (a). |
| **required 변경** | 변경은 자유. 단 `true`로 전환 시 기존 빈 값 row 카운트 경고(강제 migration 안 함). |
| **필드 삭제** | **soft delete** (`deleted_at` 컬럼) → 주기 purge 함수가 `custom_field_values -= key`로 정리. 즉시 hard delete 금지(실수 복구 불가). |
| **visible=false** | 렌더만 숨김. 값 보존. |

관련 DB 함수는 §5.5에 정의.

### 3.3 Deals / Customers

```sql
create table deals (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references workspaces(id) on delete cascade,
  company              text not null,
  stage_id             uuid references pipeline_stages(id),
  contact              text default '',
  position             text default '',
  service              text default '',
  quantity             int default 0,
  amount               int default 0,    -- 만원
  manager_user_id      uuid references auth.users(id),
  status               text default 'IN_PROGRESS',
  date                 timestamptz default now(),
  phone                text default '',
  email                text default '',
  memo                 text default '',
  custom_field_values  jsonb default '{}',
  customer_id          uuid references customers(id),
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
create index on deals (workspace_id);
create index on deals (workspace_id, stage_id);
create index on deals (workspace_id, status);
create index on deals (workspace_id, date desc);
create index on deals using gin (custom_field_values);

create table customers (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references workspaces(id) on delete cascade,
  name                 text not null,
  company              text default '',
  title                text default '',
  email                text default '',
  phone                text default '',
  location             text default '',
  status               text default '활성',
  lifecycle_stage_id   uuid references customer_lifecycle_stages(id),
  health_score         int default 70,
  custom_field_values  jsonb default '{}',
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
create index on customers (workspace_id);
create index on customers using gin (custom_field_values);

create table contracts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  customer_id  uuid not null references customers(id) on delete cascade,
  name         text not null,
  amount       int default 0,
  status       text default 'ACTIVE',   -- ACTIVE/RENEWED/EXPIRED/CHURNED
  start_date   timestamptz default now(),
  end_date     timestamptz
);
create index on contracts (workspace_id);
create index on contracts (customer_id);
```

### 3.4 활동·파일·대시보드

```sql
create table activity_logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  deal_id      uuid references deals(id) on delete cascade,
  customer_id  uuid references customers(id) on delete cascade,
  type         text not null,   -- stage_change/memo/email/call/file/created/contract_renew...
  title        text not null,
  detail       text default '',
  user_id      uuid references auth.users(id),
  created_at   timestamptz default now(),
  check (deal_id is not null or customer_id is not null)
);

create table attached_files (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  deal_id       uuid references deals(id) on delete cascade,
  customer_id   uuid references customers(id) on delete cascade,
  name          text not null,
  category      text default '기타',
  size_bytes    bigint not null,
  storage_path  text not null,    -- Supabase Storage bucket path
  mime_type     text default ''
);

create table widget_configs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  scope         text not null,                  -- 'deal' | 'customer'  (★ scope 네이밍 통일)
  widget_order  jsonb default '[]',
  widget_sizes  jsonb default '{}',
  unique (workspace_id, scope)
);

create table custom_kpi_defs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  formula      text not null,
  numerator    text,
  denominator  text,
  suffix       text default '%'
);

create table goal_defs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  target_amount int not null,
  period        text not null       -- monthly/quarterly
);
```

### 3.5 폼·챗·AI 메터링

```sql
create table web_forms (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  fields        jsonb default '[]',
  submit_token  text unique not null default gen_random_uuid()::text,
  active        bool default true
);

create table form_submissions (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references workspaces(id) on delete cascade,
  form_id              uuid not null references web_forms(id) on delete cascade,
  payload              jsonb not null,
  form_fields_snapshot jsonb not null,   -- ★ 제출 시점의 폼 필드 정의 저장
  deal_id              uuid references deals(id),
  created_at           timestamptz default now()
);

create table chat_sessions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid references auth.users(id),
  title         text default '새 대화',
  created_at    timestamptz default now()
);

create table chat_messages (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references chat_sessions(id) on delete cascade,
  role          text not null,    -- user/assistant
  content       text not null,
  created_at    timestamptz default now()
);

create table ai_usage_logs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid references auth.users(id),
  feature       text not null,    -- column-mapping/dashboard-recommendation/chat
  model         text not null,
  input_tokens  int,
  output_tokens int,
  cost_krw      int,
  latency_ms    int,              -- ★ 성능·디버깅
  request_id    text,             -- ★ Anthropic request id (지원 문의용)
  created_at    timestamptz default now()
);
create index on ai_usage_logs (workspace_id, created_at desc);
```

---

## 4. RLS 정책 (필수)

### 4.1 헬퍼

```sql
create or replace function public.is_workspace_member(wid uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid() and workspace_id = wid
  );
$$;
```

### 4.2 표준 정책 (모든 테넌트 테이블에 적용)

```sql
-- 예: deals
alter table deals enable row level security;

create policy "deals_select" on deals for select
  using (is_workspace_member(workspace_id));

create policy "deals_insert" on deals for insert
  with check (is_workspace_member(workspace_id));

create policy "deals_update" on deals for update
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

create policy "deals_delete" on deals for delete
  using (is_workspace_member(workspace_id));
```

**적용 대상 (체크리스트)**: workspaces, memberships, pipeline_stages, customer_lifecycle_stages, custom_fields, saved_views, deals, customers, contracts, activity_logs, attached_files, widget_configs, custom_kpi_defs, goal_defs, web_forms, form_submissions, chat_sessions, chat_messages, ai_usage_logs.

### 4.3 특수 정책

- **workspaces**: `select` 허용 조건 = `is_workspace_member(id)`. `insert`는 트리거로만(`security definer`), FE 직접 insert 차단.
- **memberships**: OWNER만 insert/delete(초대·제거). 자기 자신 select만 허용.
- **web_forms 공개 submit**: `form_submissions` insert 정책은 Edge Function만 통과. 클라이언트 anon 키로 직접 insert 금지.

---

## 5. 트리거·함수

### 5.1 회원가입 후 워크스페이스 자동 생성

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_ws_id uuid;
  ws_name   text;
begin
  ws_name := coalesce(new.raw_user_meta_data->>'workspace_name', split_part(new.email, '@', 1));

  insert into workspaces (name, slug)
  values (ws_name, ws_name || '-' || substr(new.id::text, 1, 8))
  returning id into new_ws_id;

  insert into memberships (user_id, workspace_id, role)
  values (new.id, new_ws_id, 'OWNER');

  perform public.seed_workspace(new_ws_id);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 5.2 `seed_workspace` — 현 `workspace-seed.ts`를 SQL로 이식

기본 파이프라인 7개 + LifecycleStage 4개 + SavedView 3개(deal/customer) + WidgetConfig 2개(deal/customer).

**★ 변경**: built-in 필드(`company`, `stage`, `contact` ...)는 seed하지 **않음**. FE `ALL_COLUMNS`가 단일 진실. `custom_fields`는 사용자가 직접 추가한 컬럼만 들어감.

### 5.3 Deal WON → Customer 자동 생성

```sql
create or replace function public.on_deal_won()
returns trigger language plpgsql as $$
begin
  if new.status = 'WON' and (old.status is null or old.status <> 'WON') then
    if new.customer_id is null then
      insert into customers (workspace_id, name, company, email, phone)
      values (new.workspace_id, coalesce(nullif(new.contact,''), new.company),
              new.company, new.email, new.phone)
      returning id into new.customer_id;
    end if;
  end if;
  return new;
end; $$;

create trigger deals_won_to_customer
  before update on deals
  for each row execute function public.on_deal_won();
```

### 5.4 `updated_at` 자동 갱신 — 필요한 모든 테이블에 공용 트리거.

### 5.5 필드 라이프사이클 관리 함수 (§3.2b 대응)

```sql
-- 필드 삭제 시 orphan jsonb 값 정리
create or replace function public.purge_orphan_custom_field_values(
  wid uuid, field_scope text, field_key text
) returns int language plpgsql security definer as $$
declare affected int;
begin
  if field_scope = 'deal' then
    update deals set custom_field_values = custom_field_values - field_key
    where workspace_id = wid and custom_field_values ? field_key;
    get diagnostics affected = row_count;
  else
    update customers set custom_field_values = custom_field_values - field_key
    where workspace_id = wid and custom_field_values ? field_key;
    get diagnostics affected = row_count;
  end if;
  return affected;
end; $$;

-- 타입 변경 시 캐스팅 (실패값은 null)
create or replace function public.migrate_field_type(
  wid uuid, field_scope text, field_key text, new_type text
) returns int language plpgsql security definer as $$
-- (구현: new_type에 따라 jsonb_set으로 캐스팅; 실패 시 null)
$$;

-- 사용 카운트 (옵션 제거 전 확인용)
create or replace function public.count_custom_field_usage(
  wid uuid, field_scope text, field_key text, field_value text
) returns int language sql stable as $$
  -- 반환: 해당 value가 쓰인 row 수
$$;
```

**호출 주체**: FE에서 필드 수정 모달의 "적용" 버튼이 supabase RPC로 호출.

### 5.6 필수 필드 검증 트리거

```sql
create or replace function public.validate_required_custom_fields()
returns trigger language plpgsql as $$
declare missing text;
begin
  select string_agg(key, ', ') into missing
  from custom_fields
  where workspace_id = new.workspace_id
    and scope = tg_argv[0]
    and required = true
    and deleted_at is null
    and not (new.custom_field_values ? key);
  if missing is not null then
    raise exception '필수 필드 누락: %', missing;
  end if;
  return new;
end; $$;

create trigger deals_validate_required
  before insert or update on deals
  for each row execute function validate_required_custom_fields('deal');

create trigger customers_validate_required
  before insert or update on customers
  for each row execute function validate_required_custom_fields('customer');
```

FE 검증과 이중 방어 — API 직접호출·벌크 임포트도 막힘.

---

## 6. Auth 플로우

### 6.1 회원가입
```ts
await supabase.auth.signUp({
  email, password,
  options: { data: { workspace_name: 워크스페이스명 } }
});
// 트리거가 workspace + membership + seed 자동 처리
```

### 6.2 로그인
```ts
await supabase.auth.signInWithPassword({ email, password });
```

### 6.3 세션 관리
- 프런트: `supabase.auth.onAuthStateChange`로 구독, localStorage는 supabase-js가 관리
- 비번 리셋·비번 변경은 Supabase 내장 API 호출 (메일은 Supabase 기본 SMTP → 베타엔 off, Phase 2에 Resend 연결)

### 6.4 현재 활성 워크스페이스
- 한 유저가 여러 워크스페이스에 속할 수 있음(향후) → 프런트에서 `localStorage['active_workspace_id']`로 관리, RLS는 membership만 보므로 DB 작업 시 `workspace_id`를 명시해야 함.
- 베타 초기엔 1인 1워크스페이스라 자동 선택.

---

## 7. Storage 설계

- **버킷 `attachments`** (private): `{workspace_id}/{deal_id|customer_id}/{uuid}-{filename}`
- **버킷 `avatars`** (public): `{workspace_id}/{user_id}.png`

### 정책 예시
```sql
create policy "attachments_rw" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'attachments'
    and is_workspace_member((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'attachments'
    and is_workspace_member((storage.foldername(name))[1]::uuid)
  );
```

업로드 후 `attached_files` 레코드에 `storage_path` 저장. 다운로드는 `createSignedUrl` (유효기간 1h).

---

## 8. Express AI 프록시 (슬림)

### 8.1 폴더 구조

```
server/src/
  index.ts                  # Express 부팅, CORS, json 미들웨어만
  middleware/
    auth.ts                 # Supabase JWT 검증 + workspaceId 확인
  routes/
    ai.ts                   # column-mapping, dashboard-recommendation
    chat.ts                 # 챗 라우트 (세션은 supabase-js로 저장)
  services/
    claude.ts               # Anthropic SDK 래퍼
    column-mapping.ts       # 기존 유지
    dashboard-recommendation.ts  # 기존 유지
    usage.ts                # ai_usage_logs insert (service_role key 사용)
  lib/
    supabase-admin.ts       # service_role 클라이언트 (서버 전용)
```

### 8.2 인증 미들웨어

```ts
import { createClient } from '@supabase/supabase-js';

export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '인증 필요' });

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return res.status(401).json({ error: '세션 만료' });

  const { data: ms } = await sb.from('memberships').select('workspace_id').eq('user_id', user.id);
  req.user = user;
  req.workspaceIds = ms?.map(m => m.workspace_id) ?? [];
  req.activeWorkspaceId = req.headers['x-workspace-id'] ?? req.workspaceIds[0];
  next();
}
```

### 8.3 AI 라우트 책임
- 입력 검증 (zod)
- Claude 호출
- 응답 반환
- `ai_usage_logs` insert (service_role 클라이언트)

**쿼터는 베타에서 skip**. 기록만 쌓아두고 데이터로 Plan 설계.

---

## 9. 프런트 통합 패턴

### 9.1 `src/app/lib/supabase.ts`
```ts
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
);
```

### 9.2 리소스 훅 (TanStack Query + supabase-js)

```ts
// src/app/hooks/useDeals.ts
export function useDeals(workspaceId: string) {
  return useQuery({
    queryKey: ['deals', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, stage:pipeline_stages(id,name,color,type)')
        .eq('workspace_id', workspaceId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const { error } = await supabase.from('deals').update(patch).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      // 낙관적 업데이트
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['deals'] }),
  });
}
```

### 9.3 훅 목록 (구현 순서)

| 순 | 훅 | 대응 테이블 | 교체 대상 state |
|---|---|---|---|
| 1 | `useAuth` | auth.users + memberships | localStorage 토큰 |
| 2 | `useCustomFields(scope)` | custom_fields | `customFields` |
| 3 | `usePipelineStages` | pipeline_stages | 단계 목록 |
| 4 | `useLifecycleStages` | customer_lifecycle_stages | |
| 5 | `useSavedViews(scope)` | saved_views | |
| 6 | `useDeals` + `useUpdateDeal/Create/Delete` | deals | `customerDeals`(영업) |
| 7 | `useActivityLogs(dealId)` | activity_logs | |
| 8 | `useAttachedFiles(dealId)` | attached_files + Storage | |
| 9 | `useCustomers` + CRUD | customers | `customerDeals`(고객) |
| 10 | `useContracts` | contracts | |
| 11 | `useWidgetConfig(scope)` `useCustomKpis` `useGoals` | 대시보드 3종 | |
| 12 | `useWebForms` `useFormSubmissions` | web_forms 등 | |
| 13 | `useChatSessions` | chat_sessions + AI 프록시 | 사이드바 최근 항목 |

---

## 10. 환경변수

### 프런트 `.env`
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:3001       # Express (AI 프록시)
```

### Express `.env` (server/)
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...            # 서버 전용 (절대 FE 노출 금지)
ANTHROPIC_API_KEY=...
FRONTEND_URL=http://localhost:5173,https://dangol.app
PORT=3001
```

---

## 11. 데이터 계약 (핵심 5가지)

| 규칙 | 내용 |
|---|---|
| `custom_field_values` | **`jsonb`로 객체 그대로 저장·조회**. FE `JSON.parse` 불필요. |
| `amount` | **만원 단위 int** 유지 (FE·BE 일치). |
| 날짜 | Postgres `timestamptz` → ISO 문자열 송수신. FE에 공용 포매터. `date` 타입 커스텀 필드도 ISO 문자열로 jsonb 저장. |
| built-in vs custom | **built-in 컬럼(`company`, `stage`, `contact` ...)은 `deals`/`customers`의 실제 컬럼**, **커스텀은 `custom_field_values jsonb`**. FE `ALL_COLUMNS`가 built-in 단일 진실이며 `custom_fields` 테이블엔 seed되지 않음. |
| `person` 타입 | jsonb 값은 `auth.users.id` **UUID 문자열**. FE는 membership 정보로 이름 표시. |
| `file` 타입 | jsonb 값은 `{ fileIds: ['<attached_files.id uuid>', ...] }`. 실제 파일은 `attached_files` + Storage. |
| `multi-select` | jsonb 값은 옵션 value의 문자열 배열. |
| scope | **`'deal'` \| `'customer'`** 로 전 테이블 통일 (`sales` 금지). |
| 필드 key | **immutable**. 생성 후 변경 불가. label만 수정 가능. |
| 에러 | `{ error: string, code?: string }` — supabase-js 에러도 이 포맷으로 정규화해 토스트. |

---

## 12. 단계별 실행 계획 (집중 6–8 영업일)

### Day 1 — Supabase 기반
- 프로젝트 생성 (서울 리전)
- 마이그레이션 파일 1개에 §3 스키마 전부 + 인덱스 + `updated_at` 트리거
- §5 함수·트리거 작성
- 수동 테스트: `supabase.auth.signUp` → workspace + seed 자동 생성 확인

### Day 2 — RLS + Storage
- §4 정책 모든 테이블 적용
- 두 워크스페이스로 격리 테스트 (cross-tenant read 차단)
- 버킷 2개 생성 + 정책

### Day 3 — FE 인증·스키마 로드
- `supabase.ts`, `auth-context`, `/login` `/signup` 페이지, 라우트 가드
- `useCustomFields` `usePipelineStages` `useLifecycleStages` `useSavedViews` 구현
- `DealflowPage`의 스키마 state 4개 교체

### Day 4 — Deal 연결
- `useDeals` + 낙관적 업데이트
- `dealflow-page.tsx`의 `customerDeals` state 교체
- 활동로그·파일(Storage presigned) 연결

### Day 5 — Customer 복제 + AI 프록시 슬림화
- `useCustomers` `useContracts` + `customer-page.tsx` 교체
- Express: auth, deals, customers, pipeline-stages, custom-fields, views, widget-config, custom-kpis, goals, activity-logs, files, forms 라우트 삭제
- AI 3개 라우트 Supabase JWT 검증으로 전환 + `ai_usage_logs` 기록

### Day 6 — 엑셀·폼·챗
- 엑셀 임포트: AI 매핑 → `custom_fields` upsert → `deals.insert([...])` bulk
- 공개 폼 submit: Supabase Edge Function `public-form-submit` 작성 (anon key로 직접 insert 불가 → service_role을 Edge Function이 대신 사용)
- Chat UI + 사이드바 최근 항목 연결

### Day 7 — 다듬기·검증
- 빈 상태/로딩/에러 UI
- 낙관적 업데이트 롤백 케이스
- 두 워크스페이스 수동 E2E (격리 재검증)
- Sentry 연결

### Day 8 — 배포 준비
- FE: Cloudflare Pages 또는 Vercel
- Express(AI): Fly.io (Dockerfile 1개)
- 프로덕션 `.env`, CORS 화이트리스트
- Supabase 프로젝트 Pro 전환 여부 검토(베타는 Free)

---

## 13. 출시 후 확장 여지 (지금은 안 함)

- Membership 초대·역할 UI (이미 테이블은 준비됨)
- 결제(토스페이먼츠) + Plan/Subscription/UsageCounter
- 아웃바운드 웹훅·API 토큰
- BullMQ 잡큐 (대용량 임포트·리마인더)
- 전문검색(`tsvector`)
- PIPA 데이터 내보내기/삭제 API

이 항목들은 **스키마와 RLS가 오늘 깔려 있으면** 나중에 테이블 몇 개와 정책만 추가하면 됨.

---

## 14. 위험 및 대응

| 위험 | 대응 |
|---|---|
| RLS 한 테이블 누락 → 데이터 유출 | §4.2 체크리스트로 19개 테이블 일괄 확인, cross-tenant 수동 테스트 |
| 트리거 `handle_new_user` 실패 시 고아 유저 | 트리거 내부 `exception when others`로 워크스페이스 롤백 후 예외 재발생 |
| `jsonb` 인덱스 없이 필드 필터 느림 | GIN 인덱스 미리 깔아 둠 (§3.3에 포함) |
| Supabase 장애 시 AI 프록시도 동작 불가(JWT 검증 실패) | 5분 캐시 또는 `getUser` 실패 시 graceful degradation — 베타엔 무시 |
| Claude 키 유출 | 항상 `SUPABASE_SERVICE_ROLE_KEY`와 함께 서버에만. 리포 `.gitignore` 점검 |
| **스키마 변경 중 데이터 손실** (타입 변경·필드 삭제) | §3.2b 규약 + §5.5 함수로 soft delete·캐스팅. 삭제 전 `count_custom_field_usage` 경고 UI. |
| **select 옵션 제거 후 과거 값 깨짐** | `options`에 `archived: true` 플래그. 드롭다운엔 숨기되 기존 값 표시 유지. |
| **엑셀 AI 매핑 충돌** (타입 불일치·새 옵션) | AI 응답에 `conflicts[]` 포함, FE 확인 UI. 커밋 전 사용자 선택. |
| **커스텀 필드 범위 쿼리 성능** (수만 행 + 정렬) | 베타는 GIN만. 특정 필드 자주 쓰면 표현식 인덱스 생성 RPC 제공 (Pro 플랜). |
| **폼 필드 변경 후 과거 submission 해석 불가** | `form_submissions.form_fields_snapshot jsonb`에 제출 시점 스키마 저장. |

---

## 15. 지금 확정 필요한 3가지

1. **리전 = 서울(`ap-northeast-2`)** 확정?
2. **이메일 확인 off** (베타) 확정?
3. **공개 폼 submit = Edge Function** 으로 (Express 완전 제거) vs Express에 남김? → Edge Function 권장.

확정되면 **Day 1 마이그레이션 SQL** 파일 작성부터 착수합니다.

---

## 16. 진행 현황 (2026-04-16 기준)

### ✅ 완료 (Day 1–4 대부분)

#### Day 1 — Supabase 기반 전부 완료
- 프로젝트 생성(서울) + 19개 테이블 + 인덱스 + `updated_at` 트리거 (`0001_init_schema.sql`)
- `handle_new_user`, `seed_workspace`, `on_deal_won`, `validate_required_custom_fields`, `purge_orphan_custom_field_values`, `migrate_field_type` (`0002`)
- signup → workspace + 파이프라인 7개 + lifecycle 4개 + 뷰 5개 + widget 2개 수동 검증 완료

#### Day 2 — RLS + Storage 전부 완료
- 19개 테이블 RLS 정책 (`0003`)
- `attachments` (private) + `avatars` (public) 버킷·정책 (`0004`)
- cross-tenant 격리 검증 (User A/B 수동 테스트)
- 핫픽스: `0005` (memberships 42P17 무한재귀), `0006` (SECURITY DEFINER search_path)

#### Day 3 — FE 인증·스키마 로드 전부 완료
- `supabase.ts`, `auth-context` (activeWorkspaceId 관리), `/login` `/signup` 페이지, `require-auth` 가드
- 훅 4종: `useCustomFields`, `usePipelineStages`, `useLifecycleStages`, `useSavedViews`
- dealflow-page 스키마 state 4개 DB hydrate

#### Day 4 — Deal 연결 (부분 완료)
- `useDeals` + `useCreateDeal` + `useUpdateDeal`(낙관적) + `useDeleteDeal`(낙관적)
- `customerDeals` DB 연동 + `adaptDealRow` 어댑터
- 뮤테이션 11곳 연결: 셀 편집·단계 이동·상태 변경·bulk 상태/삭제·AddDealModal·addBlankDeal·startBlankTable

### ⏳ 남은 작업

#### Day 4 잔여
- `useActivityLogs(dealId)` — 활동로그 (드로어 타임라인)
- `useAttachedFiles(dealId)` + Storage presigned URL — 파일 업로드/다운로드
- `manager_user_id` ↔ 이름 매핑 (현재 text manager 편집 시 `null` 저장)
- `handleOnboardingComplete` (엑셀 임포트) 로컬 전용 → bulk insert 전환
- 컬럼 삭제 시 `purge_orphan_custom_field_values` RPC 호출

#### Day 5 — Customer 복제 + AI 프록시 슬림화 (0%)
- `useCustomers` + CRUD, `useContracts`
- `customer-page.tsx` 미러 마이그레이션 (dealflow와 동일 패턴)
- `server/src/routes/` 14개 중 AI 제외 전부 삭제: auth, deals, customers, custom-fields, pipeline-stages, views, widget-config, custom-kpis, goals, activity-logs, files, forms, chat
- AI 3개 라우트를 Supabase JWT 검증 미들웨어로 전환 + `ai_usage_logs` insert

#### Day 6 — 엑셀·폼·챗 (0%)
- 엑셀 임포트: AI 매핑 → `custom_fields` upsert → `deals.insert([...])` bulk
- 공개 폼 Edge Function `public-form-submit` (service_role 사용)
- Chat UI + `chat_sessions`/`chat_messages` 연결

#### Day 7 — 다듬기·검증 (0%)
- 빈 상태/로딩/에러 UI 일관화
- 낙관적 업데이트 롤백 케이스 수동 QA
- 두 워크스페이스 E2E 격리 재검증
- Sentry (FE + 서버) 연결

#### Day 8 — 배포 (0%)
- FE Cloudflare Pages/Vercel
- AI 서버 Fly.io (Dockerfile)
- 프로덕션 `.env`, CORS 화이트리스트
- Supabase Pro 전환 결정

#### 기획안 §15 재확인 필요
- 이메일 확인 off 확정?
- 공개 폼 = Edge Function 확정? (권장안)

**다음 권장 진입점:** Day 5 Customer 미러링부터. dealflow의 Phase A+B 패턴이 template으로 잡혔으니 customer-page 복제가 가장 빠르게 끝나고, 그 뒤 Express 라우트 대량 삭제로 서버 단순화.
