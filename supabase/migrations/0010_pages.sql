-- ─────────────────────────────────────────────────────────────
-- Dangol CRM · pages 테이블 추가 (사이드바 다중 페이지 지원)
--
-- 배경: 지금까지 사이드바의 "영업관리"·"고객관리" 하위 페이지는 클라이언트
-- 전용(`new-${Date.now()}`)이라 DB 에 존재하지 않았음 → 모든 페이지가
-- 같은 queryKey `["deals", workspaceId]` / `["customers", workspaceId]` 를
-- 공유해서 데이터가 "복제" 되어 보이는 버그 발생.
--
-- 해결: 각 사이드바 페이지를 DB row 로 승격하고, deals·customers 에
-- page_id FK 를 두어 페이지별로 데이터를 격리한다.
--
-- 설계 원칙:
--   • page 는 workspace 내에서 scope ('deal'|'customer') 별로 독립
--   • custom_fields·pipeline_stages·lifecycle_stages 는 여전히 워크스페이스
--     스코프(페이지끼리 공유) — 한 페이지에서 컬럼 숨기면 같은 scope 의 다른
--     페이지에도 반영됨. 이는 의도된 단순화이며, 추후 페이지별 뷰 설정이
--     필요하면 saved_views 를 페이지별로 확장하는 방향으로 간다.
--   • 삭제는 soft delete (deleted_at) — 페이지에 딸린 deals/customers 는
--     on delete cascade 가 아니라 page_id 복구 가능하게 남겨둠.
-- ─────────────────────────────────────────────────────────────

begin;

-- ─── 1. pages 테이블 ───
create table pages (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  scope        text not null check (scope in ('deal', 'customer')),
  name         text not null,
  sort_order   int  not null default 0,
  deleted_at   timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index on pages (workspace_id, scope) where deleted_at is null;
create trigger pages_updated before update on pages
  for each row execute function set_updated_at();

alter table pages enable row level security;
create policy "pages_rw" on pages for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- ─── 2. deals / customers 에 page_id 컬럼 (nullable 로 시작) ───
alter table deals     add column page_id uuid references pages(id) on delete cascade;
alter table customers add column page_id uuid references pages(id) on delete cascade;

-- ─── 3. 기존 워크스페이스 backfill ───
-- 각 워크스페이스마다 scope 별 기본 페이지 1개씩 만들고, 해당 scope 의 모든
-- 기존 행을 그 페이지로 이동.
do $$
declare
  ws record;
  new_deal_page_id uuid;
  new_customer_page_id uuid;
begin
  for ws in select id from workspaces loop
    insert into pages (workspace_id, scope, name, sort_order)
    values (ws.id, 'deal', '영업 파이프라인', 0)
    returning id into new_deal_page_id;

    insert into pages (workspace_id, scope, name, sort_order)
    values (ws.id, 'customer', '고객 목록', 0)
    returning id into new_customer_page_id;

    update deals     set page_id = new_deal_page_id     where workspace_id = ws.id and page_id is null;
    update customers set page_id = new_customer_page_id where workspace_id = ws.id and page_id is null;
  end loop;
end $$;

-- ─── 4. NOT NULL 강제 ───
alter table deals     alter column page_id set not null;
alter table customers alter column page_id set not null;

create index on deals     (page_id);
create index on customers (page_id);

-- ─── 5. seed_workspace: 신규 워크스페이스에도 기본 페이지 주입 ───
-- 0009 의 seed_workspace 본문을 유지하되 pages 생성 블록을 앞에 추가.
create or replace function public.seed_workspace(wid uuid)
returns void language plpgsql security definer as $$
begin
  -- 기본 페이지 (scope 별 1개씩)
  insert into pages (workspace_id, scope, name, sort_order) values
    (wid, 'deal',     '영업 파이프라인', 0),
    (wid, 'customer', '고객 목록',       0);

  -- 기본 파이프라인 단계
  insert into pipeline_stages (workspace_id, name, color, type, sort_order) values
    (wid, '신규',         '#3B82F6', 'ACTIVE', 0),
    (wid, '유선상담',     '#06B6D4', 'ACTIVE', 1),
    (wid, '견적서 발송',  '#8B5CF6', 'ACTIVE', 2),
    (wid, '유선견적상담', '#6366F1', 'ACTIVE', 3),
    (wid, '가격조율',     '#F59E0B', 'ACTIVE', 4),
    (wid, '일정조율',     '#F97316', 'ACTIVE', 5),
    (wid, '수주확정',     '#10B981', 'WON',    6);

  -- 기본 고객 라이프사이클
  insert into customer_lifecycle_stages (workspace_id, name, color, type, sort_order) values
    (wid, '온보딩', '#3B82F6', 'ONBOARDING', 0),
    (wid, '활성',   '#10B981', 'ACTIVE',     1),
    (wid, '휴면',   '#F59E0B', 'DORMANT',    2),
    (wid, '이탈',   '#9CA3AF', 'CHURNED',    3);

  -- 기본 저장 뷰
  insert into saved_views (workspace_id, scope, name, view_type) values
    (wid, 'deal',     '전체 딜',     'table'),
    (wid, 'deal',     '파이프라인',  'kanban'),
    (wid, 'deal',     '일정',        'timeline'),
    (wid, 'customer', '전체 고객',   'table'),
    (wid, 'customer', '라이프사이클','kanban');

  -- 기본 위젯
  insert into widget_configs (workspace_id, scope, widget_order) values
    (wid, 'deal',     '["kpi-deals","kpi-winrate","kpi-amount","kpi-winrate-amount","funnel","donut"]'::jsonb),
    (wid, 'customer', '["kpi-repurchase","kpi-repurchase-rate","kpi-loyal","kpi-loyal-rate"]'::jsonb);

  -- built-in 필드 (deal): FE DEFAULT_FIELDS 와 1:1 대응. 전부 locked=true.
  insert into custom_fields
    (workspace_id, scope, key, label, type, required, locked, visible, sort_order, options) values
    (wid, 'deal', 'company',  '기업명',                  'text',   true,  true, true,  0,  '[]'::jsonb),
    (wid, 'deal', 'stage',    '진행상태',                'select', false, true, true,  1,  '[]'::jsonb),
    (wid, 'deal', 'contact',  '담당자',                  'text',   false, true, true,  2,  '[]'::jsonb),
    (wid, 'deal', 'position', '직책',                    'text',   false, true, false, 3,  '[]'::jsonb),
    (wid, 'deal', 'service',  '희망서비스',              'text',   false, true, true,  4,  '[]'::jsonb),
    (wid, 'deal', 'amount',   '견적금액(VAT미포함)',     'number', false, true, true,  5,  '[]'::jsonb),
    (wid, 'deal', 'quantity', '총수량',                  'number', false, true, true,  6,  '[]'::jsonb),
    (wid, 'deal', 'manager',  '고객책임자',              'person', false, true, true,  7,  '[]'::jsonb),
    (wid, 'deal', 'status',   '성공여부',                'select', false, true, true,  8,
      '[{"value":"진행중","label":"진행중"},{"value":"성공","label":"성공"},{"value":"실패","label":"실패"}]'::jsonb),
    (wid, 'deal', 'date',     '등록일',                  'date',   false, true, true,  9,  '[]'::jsonb),
    (wid, 'deal', 'phone',    '전화번호',                'phone',  false, true, false, 10, '[]'::jsonb),
    (wid, 'deal', 'email',    '이메일',                  'email',  false, true, false, 11, '[]'::jsonb),
    (wid, 'deal', 'memo',     '비고',                    'text',   false, true, false, 12, '[]'::jsonb);

  -- built-in 필드 (customer)
  insert into custom_fields
    (workspace_id, scope, key, label, type, required, locked, visible, sort_order, options) values
    (wid, 'customer', 'company',       '기업명',       'text',   true,  true, true,  0,  '[]'::jsonb),
    (wid, 'customer', 'stage',         '고객상태',     'select', false, true, true,  1,
      '[{"value":"신규","label":"신규"},{"value":"재구매","label":"재구매"},{"value":"충성고객","label":"충성고객"}]'::jsonb),
    (wid, 'customer', 'customerGrade', '고객등급',     'select', false, true, true,  2,
      '[{"value":"S등급","label":"S등급"},{"value":"A등급","label":"A등급"},{"value":"B등급","label":"B등급"},{"value":"그 외","label":"그 외"}]'::jsonb),
    (wid, 'customer', 'contact',       '담당자',       'text',   false, true, true,  3,  '[]'::jsonb),
    (wid, 'customer', 'position',      '직책',         'text',   false, true, false, 4,  '[]'::jsonb),
    (wid, 'customer', 'amount',        '누적 금액',    'number', false, true, true,  5,  '[]'::jsonb),
    (wid, 'customer', 'healthScore',   '헬스 스코어',  'number', false, true, true,  6,  '[]'::jsonb),
    (wid, 'customer', 'renewalDate',   '갱신 예정일',  'date',   false, true, true,  7,  '[]'::jsonb),
    (wid, 'customer', 'manager',       '고객 책임자',  'person', false, true, true,  8,  '[]'::jsonb),
    (wid, 'customer', 'date',          '등록일',       'date',   false, true, true,  9,  '[]'::jsonb),
    (wid, 'customer', 'phone',         '전화번호',     'phone',  false, true, false, 10, '[]'::jsonb),
    (wid, 'customer', 'email',         '이메일',       'email',  false, true, false, 11, '[]'::jsonb),
    (wid, 'customer', 'memo',          '비고',         'text',   false, true, false, 12, '[]'::jsonb);
end; $$;

commit;
