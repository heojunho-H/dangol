-- ─────────────────────────────────────────────────────────────
-- memberships RLS 무한 재귀 수정
-- 0003에서 memberships 정책이 memberships를 참조해 42P17 발생.
-- 팀 초대 UI는 plan §13에 따라 지연 범위이므로 OWNER 정책 2개를 제거.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "memberships_select_owner" on memberships;
drop policy if exists "memberships_write_owner" on memberships;

-- memberships_select_self 는 0003에서 그대로 유지.
-- handle_new_user 트리거가 security definer 로 insert하므로 write 정책 없이도 signup 동작.
