-- ============================================================
-- Floor plan layout — drawn spaces + table positions
--
-- Coordinates use an abstract 1000x700 canvas (SVG viewBox).
-- The UI scales this to fit the available screen width, so numbers
-- stay stable across devices and zoom levels.
-- ============================================================

create table if not exists public.venue_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone text not null check (zone in ('restaurant', 'terrasse', 'terrasse_couverte', 'bar')),
  x integer not null default 50,
  y integer not null default 50,
  width integer not null default 300,
  height integer not null default 200,
  color text not null default '#C4785A',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists venue_spaces_zone_idx on public.venue_spaces (zone);

alter table public.venue_spaces enable row level security;

create policy "venue_spaces_select_all" on public.venue_spaces for select using (true);
create policy "venue_spaces_manage_patron" on public.venue_spaces for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
);

-- Add position coordinates to existing tables
alter table public.venue_tables add column if not exists x integer not null default 100;
alter table public.venue_tables add column if not exists y integer not null default 100;
alter table public.venue_tables add column if not exists space_id uuid references public.venue_spaces on delete set null;
