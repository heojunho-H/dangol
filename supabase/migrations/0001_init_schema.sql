-- ─────────────────────────────────────────────────────────────
-- Dangol CRM · 초기 스키마
-- backend-plan.md §3 에 대응
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── 공용 updated_at 트리거 ───
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── §3.1 테넌시 ───
create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create trigger workspaces_updated before update on workspaces
  for each row execute function set_updated_at();

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

-- ─── §3.2 스키마 리소스 ───
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
create index on pipeline_stages (workspace_id);
create trigger pipeline_stages_updated before update on pipeline_stages
  for each row execute function set_updated_at();

create table customer_lifecycle_stages (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  color        text default '#3B82F6',
  type         text default 'ACTIVE',   -- ONBOARDING/ACTIVE/DORMANT/CHURNED
  sort_order   int default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index on customer_lifecycle_stages (workspace_id);
create trigger lifecycle_stages_updated before update on customer_lifecycle_stages
  for each row execute function set_updated_at();

create table custom_fields (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  scope        text not null check (scope in ('deal', 'customer')),
  key          text not null,
  label        text not null,
  type         text not null check (type in ('text','number','select','multi-select','date','person','phone','email','file')),
  required     bool default false,
  options      jsonb default '[]',
  visible      bool default true,
  sort_order   int default 0,
  deleted_at   timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (workspace_id, scope, key)
);
create index on custom_fields (workspace_id, scope) where deleted_at is null;
create trigger custom_fields_updated before update on custom_fields
  for each row execute function set_updated_at();

create table saved_views (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  scope         text not null check (scope in ('deal', 'customer')),
  name          text not null,
  view_type     text not null check (view_type in ('table', 'kanban', 'timeline')),
  filters       jsonb default '[]',
  sorts         jsonb default '[]',
  group_by      text default '',
  search_query  text default '',
  column_config jsonb default '[]',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index on saved_views (workspace_id, scope);
create trigger saved_views_updated before update on saved_views
  for each row execute function set_updated_at();

-- ─── §3.3 Customers (deals가 참조하므로 먼저 생성) ───
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
  lifecycle_stage_id   uuid references customer_lifecycle_stages(id) on delete set null,
  health_score         int default 70,
  custom_field_values  jsonb default '{}',
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
create index on customers (workspace_id);
create index on customers (workspace_id, lifecycle_stage_id);
create index on customers using gin (custom_field_values);
create trigger customers_updated before update on customers
  for each row execute function set_updated_at();

create table deals (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references workspaces(id) on delete cascade,
  company              text not null,
  stage_id             uuid references pipeline_stages(id) on delete set null,
  contact              text default '',
  position             text default '',
  service              text default '',
  quantity             int default 0,
  amount               int default 0,   -- 만원
  manager_user_id      uuid references auth.users(id) on delete set null,
  status               text default 'IN_PROGRESS' check (status in ('IN_PROGRESS','WON','LOST')),
  date                 timestamptz default now(),
  phone                text default '',
  email                text default '',
  memo                 text default '',
  custom_field_values  jsonb default '{}',
  customer_id          uuid references customers(id) on delete set null,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
create index on deals (workspace_id);
create index on deals (workspace_id, stage_id);
create index on deals (workspace_id, status);
create index on deals (workspace_id, date desc);
create index on deals (customer_id);
create index on deals using gin (custom_field_values);
create trigger deals_updated before update on deals
  for each row execute function set_updated_at();

create table contracts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  customer_id  uuid not null references customers(id) on delete cascade,
  name         text not null,
  amount       int default 0,     -- 만원
  status       text default 'ACTIVE' check (status in ('ACTIVE','RENEWED','EXPIRED','CHURNED')),
  start_date   timestamptz default now(),
  end_date     timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index on contracts (workspace_id);
create index on contracts (customer_id);
create trigger contracts_updated before update on contracts
  for each row execute function set_updated_at();

-- ─── §3.4 활동·파일·대시보드 ───
create table activity_logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  deal_id      uuid references deals(id) on delete cascade,
  customer_id  uuid references customers(id) on delete cascade,
  type         text not null,
  title        text not null,
  detail       text default '',
  user_id      uuid references auth.users(id) on delete set null,
  created_at   timestamptz default now(),
  check (deal_id is not null or customer_id is not null)
);
create index on activity_logs (workspace_id);
create index on activity_logs (deal_id);
create index on activity_logs (customer_id);

create table attached_files (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  deal_id       uuid references deals(id) on delete cascade,
  customer_id   uuid references customers(id) on delete cascade,
  name          text not null,
  category      text default '기타',
  size_bytes    bigint not null,
  storage_path  text not null,
  mime_type     text default '',
  created_at    timestamptz default now(),
  check (deal_id is not null or customer_id is not null)
);
create index on attached_files (workspace_id);
create index on attached_files (deal_id);
create index on attached_files (customer_id);

create table widget_configs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  scope         text not null check (scope in ('deal', 'customer')),
  widget_order  jsonb default '[]',
  widget_sizes  jsonb default '{}',
  updated_at    timestamptz default now(),
  unique (workspace_id, scope)
);
create trigger widget_configs_updated before update on widget_configs
  for each row execute function set_updated_at();

create table custom_kpi_defs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  formula      text not null,
  numerator    text,
  denominator  text,
  suffix       text default '%',
  created_at   timestamptz default now()
);
create index on custom_kpi_defs (workspace_id);

create table goal_defs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  target_amount int not null,
  period        text not null check (period in ('monthly','quarterly')),
  created_at    timestamptz default now()
);
create index on goal_defs (workspace_id);

-- ─── §3.5 폼·챗·AI 메터링 ───
create table web_forms (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  fields        jsonb default '[]',
  submit_token  text unique not null default gen_random_uuid()::text,
  active        bool default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index on web_forms (workspace_id);
create trigger web_forms_updated before update on web_forms
  for each row execute function set_updated_at();

create table form_submissions (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references workspaces(id) on delete cascade,
  form_id              uuid not null references web_forms(id) on delete cascade,
  payload              jsonb not null,
  form_fields_snapshot jsonb not null,
  deal_id              uuid references deals(id) on delete set null,
  created_at           timestamptz default now()
);
create index on form_submissions (workspace_id);
create index on form_submissions (form_id);

create table chat_sessions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  title         text default '새 대화',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index on chat_sessions (workspace_id);
create trigger chat_sessions_updated before update on chat_sessions
  for each row execute function set_updated_at();

create table chat_messages (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references chat_sessions(id) on delete cascade,
  role          text not null check (role in ('user','assistant')),
  content       text not null,
  created_at    timestamptz default now()
);
create index on chat_messages (session_id);

create table ai_usage_logs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  feature       text not null,
  model         text not null,
  input_tokens  int,
  output_tokens int,
  cost_krw      int,
  latency_ms    int,
  request_id    text,
  created_at    timestamptz default now()
);
create index on ai_usage_logs (workspace_id, created_at desc);
