-- ─────────────────────────────────────────────────────────────
-- Dangol CRM · 트리거 & seed 함수
-- backend-plan.md §5 에 대응
-- ─────────────────────────────────────────────────────────────

-- ─── §5.2 seed_workspace ───
-- 신규 워크스페이스 기본 리소스 주입. built-in 필드는 seed하지 않음 (FE ALL_COLUMNS가 단일 진실).
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

  -- 기본 저장 뷰 (영업·고객 각각)
  insert into saved_views (workspace_id, scope, name, view_type) values
    (wid, 'deal',     '전체 딜',     'table'),
    (wid, 'deal',     '파이프라인',  'kanban'),
    (wid, 'deal',     '일정',        'timeline'),
    (wid, 'customer', '전체 고객',   'table'),
    (wid, 'customer', '라이프사이클','kanban');

  -- 기본 위젯 설정
  insert into widget_configs (workspace_id, scope, widget_order) values
    (wid, 'deal', '["kpi-deals","kpi-winrate","kpi-amount","kpi-winrate-amount","funnel","donut"]'::jsonb),
    (wid, 'customer', '["kpi-repurchase","kpi-repurchase-rate","kpi-loyal","kpi-loyal-rate"]'::jsonb);
end; $$;

-- ─── §5.1 신규 auth.users → workspace + membership + seed ───
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_ws_id uuid;
  ws_name   text;
  ws_slug   text;
begin
  ws_name := coalesce(new.raw_user_meta_data->>'workspace_name', split_part(new.email, '@', 1));
  ws_slug := lower(regexp_replace(ws_name, '[^a-z0-9가-힣]', '-', 'g'))
             || '-' || substr(new.id::text, 1, 8);

  insert into public.workspaces (name, slug)
  values (ws_name, ws_slug)
  returning id into new_ws_id;

  insert into public.memberships (user_id, workspace_id, role)
  values (new.id, new_ws_id, 'OWNER');

  perform public.seed_workspace(new_ws_id);
  return new;
exception when others then
  -- 어떤 단계에서든 실패하면 트리거 전체를 롤백
  raise;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── §5.3 Deal WON → Customer 자동 생성 ───
create or replace function public.on_deal_won()
returns trigger language plpgsql as $$
declare new_customer_id uuid;
begin
  if new.status = 'WON' and (old.status is null or old.status <> 'WON') then
    if new.customer_id is null then
      insert into customers (workspace_id, name, company, email, phone)
      values (
        new.workspace_id,
        coalesce(nullif(new.contact, ''), new.company),
        new.company,
        new.email,
        new.phone
      )
      returning id into new_customer_id;
      new.customer_id := new_customer_id;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists deals_won_to_customer on deals;
create trigger deals_won_to_customer
  before update on deals
  for each row execute function public.on_deal_won();

-- ─── §5.5 필드 라이프사이클 관리 함수 ───

-- 필드 삭제 시 orphan jsonb 값 정리
create or replace function public.purge_orphan_custom_field_values(
  wid uuid, field_scope text, field_key text
) returns int language plpgsql security definer as $$
declare affected int := 0;
begin
  if field_scope = 'deal' then
    update deals
       set custom_field_values = custom_field_values - field_key
     where workspace_id = wid
       and custom_field_values ? field_key;
    get diagnostics affected = row_count;
  elsif field_scope = 'customer' then
    update customers
       set custom_field_values = custom_field_values - field_key
     where workspace_id = wid
       and custom_field_values ? field_key;
    get diagnostics affected = row_count;
  end if;
  return affected;
end; $$;

-- 특정 필드·값이 얼마나 쓰이고 있는지 카운트 (옵션 제거 전 경고용)
create or replace function public.count_custom_field_usage(
  wid uuid, field_scope text, field_key text, field_value text
) returns int language plpgsql stable as $$
declare cnt int := 0;
begin
  if field_scope = 'deal' then
    select count(*) into cnt from deals
     where workspace_id = wid
       and (custom_field_values->>field_key = field_value
            or custom_field_values->field_key ? field_value);
  elsif field_scope = 'customer' then
    select count(*) into cnt from customers
     where workspace_id = wid
       and (custom_field_values->>field_key = field_value
            or custom_field_values->field_key ? field_value);
  end if;
  return cnt;
end; $$;

-- 타입 변경 시 캐스팅 (실패값은 null)
-- 단순 구현: text로 유지 가능한 건 그대로, number/date로 캐스팅 실패 시 key 제거
create or replace function public.migrate_field_type(
  wid uuid, field_scope text, field_key text, new_type text
) returns int language plpgsql security definer as $$
declare affected int := 0;
begin
  -- MVP 단순 규칙: number/date로의 전환 시 캐스팅 실패 값은 제거
  if new_type in ('number', 'date') then
    if field_scope = 'deal' then
      update deals set custom_field_values = custom_field_values - field_key
       where workspace_id = wid
         and custom_field_values ? field_key
         and case
               when new_type = 'number' then (custom_field_values->>field_key) !~ '^-?\d+(\.\d+)?$'
               when new_type = 'date'   then
                 (select count(*) = 0 from (select (custom_field_values->>field_key)::timestamptz) t)
             end;
      get diagnostics affected = row_count;
    end if;
  end if;
  return affected;
end; $$;

-- ─── §5.6 필수 커스텀 필드 검증 트리거 ───
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

drop trigger if exists deals_validate_required on deals;
create trigger deals_validate_required
  before insert or update on deals
  for each row execute function validate_required_custom_fields('deal');

drop trigger if exists customers_validate_required on customers;
create trigger customers_validate_required
  before insert or update on customers
  for each row execute function validate_required_custom_fields('customer');
