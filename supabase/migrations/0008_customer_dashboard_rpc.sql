-- ─────────────────────────────────────────────────────────────
-- Dangol CRM · customer_dashboard RPC
-- 기존 Express /api/customers/dashboard 집계를 Postgres 함수로 이전.
-- 프론트는 supabase.rpc('customer_dashboard', { wid }) 로 호출.
--
-- 보안: security invoker (기본) — is_workspace_member(wid) 로 게이트.
--       RLS 덕분에 wid 에 대한 접근이 없으면 빈 결과가 나오지만,
--       가드를 한 번 더 두어 "워크스페이스 소속 아님" 을 명시적으로 반환.
-- ─────────────────────────────────────────────────────────────

create or replace function public.customer_dashboard(wid uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  now_ts       timestamptz := now();
  month_start  timestamptz := date_trunc('month', now_ts);
  six_months   timestamptz := date_trunc('month', now_ts) - interval '5 months';
  ninety_days  timestamptz := now_ts + interval '90 days';

  total_customers   int;
  new_this_month    int;
  avg_health        int;
  health_active     int;
  health_warning    int;
  health_risk       int;

  churned_stage_id  uuid;
  churn_rate        numeric;

  total_ltv         bigint;
  avg_contract      int;
  contract_count    int;
  won_amount        bigint;

  retention_json    jsonb;
  renewals_json     jsonb;
  upsell_json       jsonb;
  lifecycle_json    jsonb;
begin
  if not is_workspace_member(wid) then
    raise exception 'not a member of workspace %', wid using errcode = '42501';
  end if;

  -- 1) Health buckets + avg + total
  select
    count(*),
    coalesce(round(avg(health_score))::int, 0),
    count(*) filter (where health_score >= 80),
    count(*) filter (where health_score >= 50 and health_score < 80),
    count(*) filter (where health_score < 50),
    count(*) filter (where created_at >= month_start)
  into total_customers, avg_health, health_active, health_warning, health_risk, new_this_month
  from customers
  where workspace_id = wid;

  -- 2) Churn rate + retention trend
  select id into churned_stage_id
  from customer_lifecycle_stages
  where workspace_id = wid and type = 'CHURNED'
  limit 1;

  churn_rate := case
    when total_customers > 0 and churned_stage_id is not null then
      round(
        (select count(*)::numeric from customers
           where workspace_id = wid and lifecycle_stage_id = churned_stage_id)
        / total_customers * 1000
      ) / 10
    else 0
  end;

  -- 최근 6개월 리텐션: 각 월초 기준 코호트 중 churned 아닌 비율
  with months as (
    select
      generate_series(six_months, date_trunc('month', now_ts), interval '1 month') as m_start
  ),
  per_month as (
    select
      to_char(m.m_start, 'FMMM') || '월' as month,
      (select count(*) from customers c
         where c.workspace_id = wid and c.created_at <= m.m_start) as cohort,
      (select count(*) from customers c
         where c.workspace_id = wid and c.created_at <= m.m_start
           and (churned_stage_id is null or c.lifecycle_stage_id is distinct from churned_stage_id)) as survived,
      m.m_start as sort_key
    from months m
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'month', month,
      'rate', case when cohort > 0 then round(survived::numeric / cohort * 1000) / 10 else 0 end
    ) order by sort_key
  ), '[]'::jsonb)
  into retention_json
  from per_month;

  -- 3) LTV aggregates
  select
    coalesce(sum(amount), 0)::bigint,
    coalesce(round(avg(amount))::int, 0),
    count(*)
  into total_ltv, avg_contract, contract_count
  from contracts
  where workspace_id = wid;

  select coalesce(sum(amount), 0)::bigint into won_amount
  from deals
  where workspace_id = wid and status = 'WON';

  -- 4) Renewals (next 90 days)
  with up_ren as (
    select
      ct.id as contract_id,
      ct.customer_id,
      coalesce(cu.company, '') as company,
      ct.name,
      ct.amount,
      ceil(extract(epoch from (ct.end_date - now_ts)) / 86400)::int as days_until
    from contracts ct
    left join customers cu on cu.id = ct.customer_id
    where ct.workspace_id = wid
      and ct.end_date is not null
      and ct.end_date >= now_ts
      and ct.end_date <= ninety_days
    order by ct.end_date asc
    limit 10
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'contractId', contract_id,
      'customerId', customer_id,
      'company', company,
      'name', name,
      'amount', amount,
      'daysUntil', days_until
    ) order by days_until
  ), '[]'::jsonb)
  into renewals_json
  from up_ren;

  -- 5) Upsell Top 5 (health ≥ 70, score by health/contracts/ltv)
  with cand as (
    select
      c.id,
      c.company,
      c.health_score,
      coalesce(cc.cnt, 0) as cnt,
      coalesce(cl.ltv, 0) as ltv,
      round(
        c.health_score * 0.6
        + case when coalesce(cc.cnt, 0) = 0 then 30 else greatest(0, 25 - cc.cnt * 5) end
        + case when coalesce(cl.ltv, 0) > 0 then 10 else 0 end
      )::int as score
    from customers c
    left join (
      select customer_id, count(*)::int as cnt
      from contracts where workspace_id = wid
      group by customer_id
    ) cc on cc.customer_id = c.id
    left join (
      select customer_id, sum(amount)::bigint as ltv
      from contracts where workspace_id = wid
      group by customer_id
    ) cl on cl.customer_id = c.id
    where c.workspace_id = wid and c.health_score >= 70
    order by score desc
    limit 5
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'customerId', id,
      'company', company,
      'healthScore', health_score,
      'contractCount', cnt,
      'ltv', ltv,
      'score', score,
      'reason', case
        when cnt = 0 then '헬스 양호 — 첫 추가 계약 제안 적합'
        else '현재 계약 ' || cnt::text || '건 — 추가 모듈 제안 가능'
      end
    ) order by score desc
  ), '[]'::jsonb)
  into upsell_json
  from cand;

  -- 6) Lifecycle distribution (stage 기준, 0 포함)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'stageId', s.id,
      'stage', s.name,
      'type', s.type,
      'color', s.color,
      'count', coalesce(sc.cnt, 0)
    ) order by s.sort_order
  ), '[]'::jsonb)
  into lifecycle_json
  from customer_lifecycle_stages s
  left join (
    select lifecycle_stage_id, count(*)::int as cnt
    from customers
    where workspace_id = wid and lifecycle_stage_id is not null
    group by lifecycle_stage_id
  ) sc on sc.lifecycle_stage_id = s.id
  where s.workspace_id = wid;

  return jsonb_build_object(
    'kpi', jsonb_build_object(
      'totalCustomers', total_customers,
      'newThisMonth', new_this_month,
      'totalLtv', total_ltv,
      'avgContract', avg_contract,
      'renewalsCount', jsonb_array_length(renewals_json),
      'churnRate', churn_rate
    ),
    'health', jsonb_build_object(
      'active', health_active,
      'warning', health_warning,
      'risk', health_risk,
      'total', total_customers,
      'avgHealth', avg_health
    ),
    'retention', retention_json,
    'ltv', jsonb_build_object(
      'total', total_ltv,
      'avgContract', avg_contract,
      'contractCount', contract_count,
      'wonAmount', won_amount
    ),
    'renewals', renewals_json,
    'upsell', upsell_json,
    'lifecycle', lifecycle_json
  );
end;
$$;

grant execute on function public.customer_dashboard(uuid) to authenticated;
