-- ============================================================
-- Messages — management messages displayed in "Ce Soir"
-- ============================================================

create table public.messages (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  date date not null,
  created_by uuid references public.profiles not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Everyone can read messages
create policy "messages_select_all"
  on public.messages for select
  using (true);

-- Only patrons can create/update/delete
create policy "messages_insert_patron"
  on public.messages for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "messages_update_patron"
  on public.messages for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "messages_delete_patron"
  on public.messages for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

-- Enable realtime for messages
alter publication supabase_realtime add table public.messages;
