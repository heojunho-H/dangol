-- ─────────────────────────────────────────────────────────────
-- Dangol CRM · Storage 버킷 + 정책
-- backend-plan.md §7 에 대응
--
-- 경로 규약: {workspace_id}/{deal_id|customer_id}/{uuid}-{filename}
-- ─────────────────────────────────────────────────────────────

-- 버킷 생성 (Supabase Dashboard에서 만들어도 되지만 SQL로 재현 가능하게)
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ── attachments: 인증 사용자만, 그리고 자기 워크스페이스 폴더만 ──
create policy "attachments_read_member" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "attachments_insert_member" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "attachments_update_member" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'attachments'
    and is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "attachments_delete_member" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

-- ── avatars: 공개 읽기, 업로드는 인증 사용자 본인 워크스페이스 폴더만 ──
create policy "avatars_read_public" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

create policy "avatars_write_member" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "avatars_update_member" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "avatars_delete_member" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and is_workspace_member(((storage.foldername(name))[1])::uuid)
  );
