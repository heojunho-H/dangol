-- ─────────────────────────────────────────────────────────────
-- SECURITY DEFINER 함수의 search_path 세팅
-- 원인: SECURITY DEFINER 함수는 기본적으로 search_path가 비어있어
--       unqualified 테이블 참조 (예: pipeline_stages)가
--       "relation ... does not exist" 로 실패.
-- 해결: 함수 레벨에서 search_path = public 고정.
-- ─────────────────────────────────────────────────────────────

alter function public.handle_new_user()                             set search_path = public;
alter function public.seed_workspace(uuid)                          set search_path = public;
alter function public.is_workspace_member(uuid)                     set search_path = public;
alter function public.purge_orphan_custom_field_values(uuid, text, text)  set search_path = public;
alter function public.migrate_field_type(uuid, text, text, text)    set search_path = public;
