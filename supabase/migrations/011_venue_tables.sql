-- ============================================================
-- Venue Tables — Le Hive floor plan
-- ============================================================

create table public.venue_tables (
  id text primary key, -- e.g. '400', '210', '50'
  zone text not null check (zone in ('restaurant', 'terrasse', 'terrasse_couverte', 'bar')),
  capacity int not null check (capacity > 0),
  max_capacity int not null check (max_capacity >= capacity),
  table_type text not null default 'standard' check (table_type in ('standard', 'high', 'round')),
  sort_order int not null default 0
);

alter table public.venue_tables enable row level security;
create policy "venue_tables_select_all" on public.venue_tables for select using (true);
create policy "venue_tables_manage_patron" on public.venue_tables for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
);

-- Add table assignment to reservations
alter table public.reservations add column table_id text references public.venue_tables;

-- ============================================================
-- Seed: Le Hive floor plan
-- ============================================================

-- Restaurant
insert into public.venue_tables (id, zone, capacity, max_capacity, table_type, sort_order) values
  ('400', 'restaurant', 4, 6, 'standard', 1),
  ('410', 'restaurant', 8, 10, 'standard', 2),
  ('420', 'restaurant', 8, 10, 'standard', 3),
  ('430', 'restaurant', 2, 2, 'standard', 4),
  ('440', 'restaurant', 4, 4, 'standard', 5),
  ('450', 'restaurant', 4, 4, 'standard', 6),
  ('460', 'restaurant', 4, 5, 'standard', 7),
  ('470', 'restaurant', 6, 8, 'standard', 8),
  ('480', 'restaurant', 4, 5, 'standard', 9),
  ('490', 'restaurant', 6, 6, 'standard', 10);

-- Terrasse
insert into public.venue_tables (id, zone, capacity, max_capacity, table_type, sort_order) values
  ('200', 'terrasse', 8, 8, 'high', 1),
  ('210', 'terrasse', 8, 8, 'high', 2),
  ('220', 'terrasse', 8, 8, 'high', 3),
  ('230', 'terrasse', 8, 8, 'round', 4),
  ('240', 'terrasse', 4, 4, 'high', 5),
  ('250', 'terrasse', 2, 2, 'high', 6),
  ('100', 'terrasse', 2, 2, 'standard', 7),
  ('110', 'terrasse', 4, 4, 'standard', 8),
  ('120', 'terrasse', 4, 4, 'standard', 9),
  ('130', 'terrasse', 4, 4, 'standard', 10),
  ('140', 'terrasse', 4, 4, 'standard', 11),
  ('150', 'terrasse', 2, 2, 'standard', 12),
  ('160', 'terrasse', 2, 2, 'standard', 13);

-- Terrasse couverte (non-fumeur)
insert into public.venue_tables (id, zone, capacity, max_capacity, table_type, sort_order) values
  ('300', 'terrasse_couverte', 2, 2, 'high', 1),
  ('310', 'terrasse_couverte', 2, 2, 'high', 2),
  ('320', 'terrasse_couverte', 2, 2, 'standard', 3),
  ('330', 'terrasse_couverte', 2, 2, 'standard', 4),
  ('340', 'terrasse_couverte', 2, 2, 'standard', 5);

-- Bar
insert into public.venue_tables (id, zone, capacity, max_capacity, table_type, sort_order) values
  ('50', 'bar', 6, 6, 'standard', 1),
  ('60', 'bar', 6, 6, 'standard', 2),
  ('70', 'bar', 6, 6, 'standard', 3),
  ('80', 'bar', 4, 4, 'standard', 4),
  ('90', 'bar', 4, 4, 'standard', 5);
