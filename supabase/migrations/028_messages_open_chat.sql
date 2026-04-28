-- ============================================================
-- Open messages to the whole team — chat-like behavior
--
-- Bug fix: the UI has been opening message creation to everyone
-- since "Messages: two-way team comms" (commit bff4d83), but the
-- INSERT policy stayed patron-only at the DB level. Responsables +
-- staff hit a silent RLS rejection when trying to post.
--
-- Vision: messages = WhatsApp replacement for the team. Everyone
-- authenticated can post. Delete restricted to author or patron.
-- ============================================================

drop policy if exists "messages_insert_patron" on public.messages;
drop policy if exists "messages_delete_patron" on public.messages;
drop policy if exists "messages_update_patron" on public.messages;

create policy "messages_insert_authenticated"
  on public.messages for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "messages_delete_own_or_patron"
  on public.messages for delete
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

-- Update kept patron-only (we don't have an edit feature; this is just
-- defensive). Left as-is; recreate explicitly if needed:
create policy "messages_update_patron"
  on public.messages for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );
