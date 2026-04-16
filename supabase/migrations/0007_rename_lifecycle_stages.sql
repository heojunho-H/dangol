-- ─────────────────────────────────────────────────────────────
-- Dangol CRM · customer_lifecycle_stages 이름을 프론트 UX 에 맞춤
-- Frontend customer-page.tsx 의 stage 값: 신규 | 재구매 | 충성고객 | 이탈
-- 기존 seed: 온보딩/활성/휴면/이탈 → 신규/재구매/충성고객/이탈
-- ─────────────────────────────────────────────────────────────

-- 1) seed_workspace 함수 재정의 (신규 워크스페이스)
create or replace function public.seed_workspace(wid uuid)
returns void language plpgsql security definer as $$
begin
  insert into pipeline_stages (workspace_id, name, color, type, sort_order) values
    (wid, '신규',         '#3B82F6', 'ACTIVE', 0),
    (wid, '유선상담',     '#06B6D4', 'ACTIVE', 1),
    (wid, '견적서 발송',  '#8B5CF6', 'ACTIVE', 2),
    (wid, '유선견적상담', '#6366F1', 'ACTIVE', 3),
    (wid, '가격조율',     '#F59E0B', 'ACTIVE', 4),
    (wid, '일정조율',     '#F97316', 'ACTIVE', 5),
    (wid, '수주확정',     '#10B981', 'WON',    6);

  insert into customer_lifecycle_stages (workspace_id, name, color, type, sort_order) values
    (wid, '신규',     '#3B82F6', 'ONBOARDING', 0),
    (wid, '재구매',   '#10B981', 'ACTIVE',     1),
    (wid, '충성고객', '#1A472A', 'ACTIVE',     2),
    (wid, '이탈',     '#9CA3AF', 'CHURNED',    3);

  insert into saved_views (workspace_id, scope, name, view_type) values
    (wid, 'deal',     '전체 딜',     'table'),
    (wid, 'deal',     '파이프라인',  'kanban'),
    (wid, 'deal',     '일정',        'timeline'),
    (wid, 'customer', '전체 고객',   'table'),
    (wid, 'customer', '라이프사이클','kanban');

  insert into widget_configs (workspace_id, scope, widget_order) values
    (wid, 'deal', '["kpi-deals","kpi-winrate","kpi-amount","kpi-winrate-amount","funnel","donut"]'::jsonb),
    (wid, 'customer', '["kpi-repurchase","kpi-repurchase-rate","kpi-loyal","kpi-loyal-rate"]'::jsonb);
end; $$;

-- 2) 기존 워크스페이스의 라이프사이클 stage 이름/색상/sort_order 일괄 갱신
--    type 기준으로 안정적으로 매칭. 이미 리네임된 경우는 no-op 에 가깝게.
update customer_lifecycle_stages
   set name = '신규', color = '#3B82F6', sort_order = 0
 where type = 'ONBOARDING';

update customer_lifecycle_stages
   set name = '재구매', color = '#10B981', sort_order = 1
 where type = 'ACTIVE' and name in ('활성', '재구매');

-- 기존 '휴면'(DORMANT) 은 충성고객으로 재배정 — 프론트 3-stage 모델과 DORMANT 가 중첩되지 않도록
update customer_lifecycle_stages
   set name = '충성고객', color = '#1A472A', type = 'ACTIVE', sort_order = 2
 where type = 'DORMANT' or name = '충성고객';

update customer_lifecycle_stages
   set name = '이탈', color = '#9CA3AF', sort_order = 3
 where type = 'CHURNED';
