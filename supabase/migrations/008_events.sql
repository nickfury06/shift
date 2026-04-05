-- ============================================================
-- Events — tonight's activity/event displayed in "Ce Soir"
-- ============================================================

create table public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  date date not null,
  created_by uuid references public.profiles not null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "events_select_all"
  on public.events for select
  using (true);

create policy "events_insert_patron"
  on public.events for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "events_update_patron"
  on public.events for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "events_delete_patron"
  on public.events for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );
