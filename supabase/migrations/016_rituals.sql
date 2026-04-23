-- ============================================================
-- Rituals — recurring weekly activities shown in "Ce Soir"
-- (e.g. DJ every Friday 22h, Quiz every Tuesday 20h)
-- ============================================================

create table if not exists public.rituals (
  id uuid default gen_random_uuid() primary key,
  day text not null check (day in ('lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche')),
  time time not null,
  name text not null,
  description text,
  organizer text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists rituals_day_idx on public.rituals (day) where active;

alter table public.rituals enable row level security;

create policy "rituals_select_all"
  on public.rituals for select
  using (true);

create policy "rituals_insert_patron"
  on public.rituals for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "rituals_update_patron"
  on public.rituals for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "rituals_delete_patron"
  on public.rituals for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );
