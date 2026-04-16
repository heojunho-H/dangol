-- ─────────────────────────────────────────────────────────────
-- Dangol CRM · built-in 필드를 custom_fields DB 로 흡수
--
-- 배경: 지금까지 built-in 컬럼(기업명·담당자 등)은 FE 상수(DEFAULT_FIELDS)로만
-- 존재 → 사용자가 순서를 바꾸거나 숨기면 새로고침 시 리셋. 컬럼 스키마의
-- 이중 소스(FE 상수 + DB custom_fields) 를 하나로 합쳐 영속화.
--
-- 변경:
--   1) custom_fields 에 `locked` 플래그 추가 (삭제·타입변경 금지, rename/visible/sort_order 는 허용)
--   2) seed_workspace() 에 built-in 필드 INSERT 추가 (deal 13개 + customer 13개)
--   3) 기존 워크스페이스 backfill (ON CONFLICT DO NOTHING)
--   4) validate_required_custom_fields 트리거가 locked=true 필드를 건너뛰도록 수정
--      (built-in `company` 같은 필드는 custom_field_values 가 아닌 실 컬럼에 저장됨)
-- ─────────────────────────────────────────────────────────────

begin;

-- ─── 1. locked 컬럼 추가 ───
alter table custom_fields
  add column if not exists locked boolean not null default false;

-- ─── 2. seed_workspace 확장 ───
create or replace function public.seed_workspace(wid uuid)
returns void language plpgsql security definer as $$
begin
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

-- ─── 3. 기존 워크스페이스 backfill ───
-- 배포 이전에 생성된 워크스페이스는 custom_fields 에 built-in 이 없음.
-- (workspace_id, scope, key) unique 제약이 있으므로 ON CONFLICT DO NOTHING 으로 중복 방지.
insert into custom_fields
  (workspace_id, scope, key, label, type, required, locked, visible, sort_order, options)
select w.id, f.scope, f.key, f.label, f.type, f.required, true, f.visible, f.sort_order, f.options
from workspaces w
cross join (values
  ('deal'::text, 'company',  '기업명',                  'text',   true,  true,  0,  '[]'::jsonb),
  ('deal',       'stage',    '진행상태',                'select', false, true,  1,  '[]'::jsonb),
  ('deal',       'contact',  '담당자',                  'text',   false, true,  2,  '[]'::jsonb),
  ('deal',       'position', '직책',                    'text',   false, false, 3,  '[]'::jsonb),
  ('deal',       'service',  '희망서비스',              'text',   false, true,  4,  '[]'::jsonb),
  ('deal',       'amount',   '견적금액(VAT미포함)',     'number', false, true,  5,  '[]'::jsonb),
  ('deal',       'quantity', '총수량',                  'number', false, true,  6,  '[]'::jsonb),
  ('deal',       'manager',  '고객책임자',              'person', false, true,  7,  '[]'::jsonb),
  ('deal',       'status',   '성공여부',                'select', false, true,  8,
    '[{"value":"진행중","label":"진행중"},{"value":"성공","label":"성공"},{"value":"실패","label":"실패"}]'::jsonb),
  ('deal',       'date',     '등록일',                  'date',   false, true,  9,  '[]'::jsonb),
  ('deal',       'phone',    '전화번호',                'phone',  false, false, 10, '[]'::jsonb),
  ('deal',       'email',    '이메일',                  'email',  false, false, 11, '[]'::jsonb),
  ('deal',       'memo',     '비고',                    'text',   false, false, 12, '[]'::jsonb),
  ('customer',   'company',       '기업명',       'text',   true,  true,  0,  '[]'::jsonb),
  ('customer',   'stage',         '고객상태',     'select', false, true,  1,
    '[{"value":"신규","label":"신규"},{"value":"재구매","label":"재구매"},{"value":"충성고객","label":"충성고객"}]'::jsonb),
  ('customer',   'customerGrade', '고객등급',     'select', false, true,  2,
    '[{"value":"S등급","label":"S등급"},{"value":"A등급","label":"A등급"},{"value":"B등급","label":"B등급"},{"value":"그 외","label":"그 외"}]'::jsonb),
  ('customer',   'contact',       '담당자',       'text',   false, true,  3,  '[]'::jsonb),
  ('customer',   'position',      '직책',         'text',   false, false, 4,  '[]'::jsonb),
  ('customer',   'amount',        '누적 금액',    'number', false, true,  5,  '[]'::jsonb),
  ('customer',   'healthScore',   '헬스 스코어',  'number', false, true,  6,  '[]'::jsonb),
  ('customer',   'renewalDate',   '갱신 예정일',  'date',   false, true,  7,  '[]'::jsonb),
  ('customer',   'manager',       '고객 책임자',  'person', false, true,  8,  '[]'::jsonb),
  ('customer',   'date',          '등록일',       'date',   false, true,  9,  '[]'::jsonb),
  ('customer',   'phone',         '전화번호',     'phone',  false, false, 10, '[]'::jsonb),
  ('customer',   'email',         '이메일',       'email',  false, false, 11, '[]'::jsonb),
  ('customer',   'memo',          '비고',         'text',   false, false, 12, '[]'::jsonb)
) as f(scope, key, label, type, required, visible, sort_order, options)
on conflict (workspace_id, scope, key) do nothing;

-- ─── 4. validate_required_custom_fields: locked=true 필드 제외 ───
-- built-in 필수 필드(`company` 등)는 실 컬럼으로 저장되므로 custom_field_values 를
-- 검사하면 안 됨. locked=false (사용자 정의) 필수 필드만 검증.
create or replace function public.validate_required_custom_fields()
returns trigger language plpgsql as $$
declare missing text;
begin
  select string_agg(key, ', ') into missing
    from custom_fields
   where workspace_id = new.workspace_id
     and scope = tg_argv[0]
     and required = true
     and locked = false
     and deleted_at is null
     and not (new.custom_field_values ? key);
  if missing is not null then
    raise exception '필수 필드 누락: %', missing;
  end if;
  return new;
end; $$;

commit;
