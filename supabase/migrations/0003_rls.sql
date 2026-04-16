-- ─────────────────────────────────────────────────────────────
-- Dangol CRM · Row Level Security
-- backend-plan.md §4 에 대응
--
-- 전제: 모든 테넌트 테이블은 workspace_id 를 가지며,
--       auth.uid() ∈ memberships(workspace_id) 여부로 접근 판단.
-- ─────────────────────────────────────────────────────────────

-- ─── §4.1 헬퍼 ───
create or replace function public.is_workspace_member(wid uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from memberships
     where user_id = auth.uid()
       and workspace_id = wid
  );
$$;

-- ─── §4.3 workspaces ───
alter table workspaces enable row level security;

create policy "workspaces_select_member" on workspaces
  for select using (is_workspace_member(id));

-- workspaces insert 은 handle_new_user (security definer) 로만.
-- update는 OWNER만 (베타 단순화)
create policy "workspaces_update_owner" on workspaces
  for update using (
    exists (select 1 from memberships
             where user_id = auth.uid()
               and workspace_id = workspaces.id
               and role = 'OWNER')
  );

-- ─── §4.3 memberships ───
alter table memberships enable row level security;

-- 자기 자신의 membership 행은 조회 가능
create policy "memberships_select_self" on memberships
  for select using (user_id = auth.uid());

-- 같은 워크스페이스 OWNER는 다른 멤버도 조회 가능 (팀 관리용)
create policy "memberships_select_owner" on memberships
  for select using (
    exists (select 1 from memberships m
             where m.user_id = auth.uid()
               and m.workspace_id = memberships.workspace_id
               and m.role = 'OWNER')
  );

-- insert/delete 는 OWNER만 (초대·제거)
create policy "memberships_write_owner" on memberships
  for all using (
    exists (select 1 from memberships m
             where m.user_id = auth.uid()
               and m.workspace_id = memberships.workspace_id
               and m.role = 'OWNER')
  ) with check (
    exists (select 1 from memberships m
             where m.user_id = auth.uid()
               and m.workspace_id = memberships.workspace_id
               and m.role = 'OWNER')
  );

-- ─── §4.2 테넌트 표준 정책 헬퍼 매크로
-- (Postgres에 매크로 없으므로 테이블마다 4개 정책을 나열)
-- 대상: pipeline_stages · customer_lifecycle_stages · custom_fields · saved_views
--      · deals · customers · contracts · activity_logs · attached_files
--      · widget_configs · custom_kpi_defs · goal_defs
--      · web_forms · form_submissions · chat_sessions · chat_messages · ai_usage_logs
-- ─────────────────────────────────────────────────────────────

-- pipeline_stages
alter table pipeline_stages enable row level security;
create policy "pipeline_stages_rw" on pipeline_stages for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- customer_lifecycle_stages
alter table customer_lifecycle_stages enable row level security;
create policy "lifecycle_stages_rw" on customer_lifecycle_stages for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- custom_fields
alter table custom_fields enable row level security;
create policy "custom_fields_rw" on custom_fields for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- saved_views
alter table saved_views enable row level security;
create policy "saved_views_rw" on saved_views for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- deals
alter table deals enable row level security;
create policy "deals_rw" on deals for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- customers
alter table customers enable row level security;
create policy "customers_rw" on customers for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- contracts
alter table contracts enable row level security;
create policy "contracts_rw" on contracts for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- activity_logs
alter table activity_logs enable row level security;
create policy "activity_logs_rw" on activity_logs for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- attached_files
alter table attached_files enable row level security;
create policy "attached_files_rw" on attached_files for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- widget_configs
alter table widget_configs enable row level security;
create policy "widget_configs_rw" on widget_configs for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- custom_kpi_defs
alter table custom_kpi_defs enable row level security;
create policy "custom_kpi_defs_rw" on custom_kpi_defs for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- goal_defs
alter table goal_defs enable row level security;
create policy "goal_defs_rw" on goal_defs for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- web_forms
alter table web_forms enable row level security;
create policy "web_forms_rw" on web_forms for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- form_submissions — read only for members.
-- insert 는 Edge Function (service_role) 으로만 (anon 차단)
alter table form_submissions enable row level security;
create policy "form_submissions_read" on form_submissions
  for select using (is_workspace_member(workspace_id));

-- chat_sessions
alter table chat_sessions enable row level security;
create policy "chat_sessions_rw" on chat_sessions for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- chat_messages — 세션의 워크스페이스 멤버만
alter table chat_messages enable row level security;
create policy "chat_messages_rw" on chat_messages for all
  using (
    exists (select 1 from chat_sessions s
             where s.id = chat_messages.session_id
               and is_workspace_member(s.workspace_id))
  ) with check (
    exists (select 1 from chat_sessions s
             where s.id = chat_messages.session_id
               and is_workspace_member(s.workspace_id))
  );

-- ai_usage_logs — read only (insert는 Express 프록시가 service_role로)
alter table ai_usage_logs enable row level security;
create policy "ai_usage_logs_read" on ai_usage_logs
  for select using (is_workspace_member(workspace_id));
