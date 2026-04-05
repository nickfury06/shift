-- ============================================================
-- Schedules — staff work shifts
-- ============================================================

create table public.schedules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.schedules enable row level security;

-- Everyone can read all schedules
create policy "schedules_select_all"
  on public.schedules for select
  using (true);

-- Only patrons can manage schedules
create policy "schedules_insert_patron"
  on public.schedules for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "schedules_update_patron"
  on public.schedules for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "schedules_delete_patron"
  on public.schedules for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );
