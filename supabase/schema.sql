-- ============================================================
-- SHIFT — Complete Database Schema
-- Run this in the Supabase SQL Editor to create all tables
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  role text not null check (role in ('patron', 'responsable', 'staff')),
  stock_domain text check (stock_domain in ('boissons', 'vins') or stock_domain is null),
  must_change_password boolean not null default true,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_patron" on public.profiles for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "profiles_update_patron" on public.profiles for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron') or id = auth.uid());
create policy "profiles_delete_patron" on public.profiles for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));


-- ────────────────────────────────────────────────────────────
-- 2. TASKS (recurring)
-- ────────────────────────────────────────────────────────────

create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  note text,
  zone text not null check (zone in ('bar', 'terrasse', 'restaurant')),
  moment text not null check (moment in ('ouverture', 'service', 'fermeture')),
  assigned_to uuid[] not null default '{}',
  days text[] not null default '{}',
  priority int not null default 3 check (priority between 1 and 5),
  is_reminder boolean not null default false,
  is_libre boolean not null default false,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
create policy "tasks_select_all" on public.tasks for select using (true);
create policy "tasks_insert_patron" on public.tasks for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "tasks_update_patron" on public.tasks for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "tasks_delete_patron" on public.tasks for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));


-- ────────────────────────────────────────────────────────────
-- 3. ONE-OFF TASKS (date-specific)
-- ────────────────────────────────────────────────────────────

create table if not exists public.one_off_tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  note text,
  zone text not null check (zone in ('bar', 'terrasse', 'restaurant')),
  moment text not null check (moment in ('ouverture', 'service', 'fermeture')),
  assigned_to uuid[] not null default '{}',
  date date not null,
  priority int not null default 3 check (priority between 1 and 5),
  is_reminder boolean not null default false,
  is_libre boolean not null default false,
  completed boolean not null default false,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now()
);

alter table public.one_off_tasks enable row level security;
create policy "one_off_tasks_select_all" on public.one_off_tasks for select using (true);
create policy "one_off_tasks_insert_patron" on public.one_off_tasks for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "one_off_tasks_update_patron" on public.one_off_tasks for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "one_off_tasks_delete_patron" on public.one_off_tasks for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));


-- ────────────────────────────────────────────────────────────
-- 4. TASK COMPLETIONS
-- ────────────────────────────────────────────────────────────

create table if not exists public.task_completions (
  id uuid default gen_random_uuid() primary key,
  task_id uuid not null,
  user_id uuid references public.profiles not null,
  date date not null,
  moment text not null check (moment in ('ouverture', 'service', 'fermeture')),
  completed_at timestamptz not null default now(),
  unique (task_id, date, user_id)
);

alter table public.task_completions enable row level security;
create policy "task_completions_select_all" on public.task_completions for select using (true);
create policy "task_completions_insert_own" on public.task_completions for insert
  with check (user_id = auth.uid());
create policy "task_completions_delete_own" on public.task_completions for delete
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.task_completions;


-- ────────────────────────────────────────────────────────────
-- 5. SCHEDULES
-- ────────────────────────────────────────────────────────────

create table if not exists public.schedules (
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
create policy "schedules_select_all" on public.schedules for select using (true);
create policy "schedules_insert_patron" on public.schedules for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "schedules_update_patron" on public.schedules for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "schedules_delete_patron" on public.schedules for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));


-- ────────────────────────────────────────────────────────────
-- 6. RESERVATIONS
-- ────────────────────────────────────────────────────────────

create table if not exists public.reservations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  covers int not null check (covers > 0),
  time time not null,
  date date not null,
  seating text not null check (seating in ('interieur', 'terrasse')),
  type text not null check (type in ('diner', 'drinks')),
  source text not null check (source in ('instagram', 'telephone', 'walk-in')),
  notes text,
  status text not null default 'attendu' check (status in ('attendu', 'arrive')),
  arrived_by uuid references public.profiles,
  table_id text,
  created_by uuid references public.profiles not null,
  created_at timestamptz not null default now()
);

alter table public.reservations enable row level security;
create policy "reservations_select_all" on public.reservations for select using (true);
create policy "reservations_insert_all" on public.reservations for insert with check (auth.uid() is not null);
create policy "reservations_update_all" on public.reservations for update using (auth.uid() is not null);
create policy "reservations_delete_all" on public.reservations for delete using (auth.uid() is not null);

alter publication supabase_realtime add table public.reservations;


-- ────────────────────────────────────────────────────────────
-- 7. MESSAGES
-- ────────────────────────────────────────────────────────────

create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  date date not null,
  created_by uuid references public.profiles not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;
create policy "messages_select_all" on public.messages for select using (true);
create policy "messages_insert_patron" on public.messages for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "messages_update_patron" on public.messages for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "messages_delete_patron" on public.messages for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));

alter publication supabase_realtime add table public.messages;


-- ────────────────────────────────────────────────────────────
-- 8. DEBRIEFS
-- ────────────────────────────────────────────────────────────

create table if not exists public.debriefs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles not null,
  date date not null,
  global_score int not null check (global_score between 1 and 5),
  service_score int not null check (service_score between 1 and 5),
  coordination_score int not null check (coordination_score between 1 and 5),
  ambiance_score int not null check (ambiance_score between 1 and 5),
  proprete_score int not null check (proprete_score between 1 and 5),
  service_comment text,
  coordination_comment text,
  ambiance_comment text,
  proprete_comment text,
  suggestions text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.debriefs enable row level security;
create policy "debriefs_insert_own" on public.debriefs for insert with check (user_id = auth.uid());
create policy "debriefs_select" on public.debriefs for select
  using (user_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role in ('patron', 'responsable')));


-- ────────────────────────────────────────────────────────────
-- 9. EVENTS
-- ────────────────────────────────────────────────────────────

create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  date date not null,
  start_time time,
  end_time time,
  created_by uuid references public.profiles not null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
create policy "events_select_all" on public.events for select using (true);
create policy "events_insert_patron" on public.events for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "events_update_patron" on public.events for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "events_delete_patron" on public.events for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));


-- ────────────────────────────────────────────────────────────
-- 10. AVAILABILITY REQUESTS
-- ────────────────────────────────────────────────────────────

create table if not exists public.availability_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles not null,
  date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'refused')),
  created_at timestamptz not null default now()
);

alter table public.availability_requests enable row level security;
create policy "availability_requests_insert_own" on public.availability_requests for insert with check (user_id = auth.uid());
create policy "availability_requests_select" on public.availability_requests for select
  using (user_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "availability_requests_update_patron" on public.availability_requests for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));


-- ────────────────────────────────────────────────────────────
-- 11. DISCOUNT REQUESTS (F&F invitations)
-- ────────────────────────────────────────────────────────────

create table if not exists public.discount_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles not null,
  guest_name text not null,
  date date not null,
  guest_count int not null default 1 check (guest_count > 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'refused')),
  patron_note text,
  created_at timestamptz not null default now()
);

alter table public.discount_requests enable row level security;
create policy "discount_requests_insert_own" on public.discount_requests for insert with check (user_id = auth.uid());
create policy "discount_requests_select" on public.discount_requests for select
  using (user_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "discount_requests_update_patron" on public.discount_requests for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));


-- ────────────────────────────────────────────────────────────
-- 12. SETTINGS
-- ────────────────────────────────────────────────────────────

create table if not exists public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
create policy "settings_select_all" on public.settings for select using (true);
create policy "settings_upsert_patron" on public.settings for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "settings_update_patron" on public.settings for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));

insert into public.settings (key, value) values
  ('discount_frequency', 'monthly'),
  ('discount_max_per_period', '1')
on conflict (key) do nothing;


-- ────────────────────────────────────────────────────────────
-- 13. PUSH SUBSCRIPTIONS
-- ────────────────────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles not null,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy "push_subscriptions_select_own" on public.push_subscriptions for select using (user_id = auth.uid());
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete using (user_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 14. VENUE TABLES (floor plan)
-- ────────────────────────────────────────────────────────────

create table if not exists public.venue_tables (
  id text primary key,
  zone text not null check (zone in ('restaurant', 'terrasse', 'terrasse_couverte', 'bar')),
  capacity int not null check (capacity > 0),
  max_capacity int not null check (max_capacity >= capacity),
  table_type text not null default 'standard' check (table_type in ('standard', 'high', 'round')),
  sort_order int not null default 0
);

alter table public.venue_tables enable row level security;
create policy "venue_tables_select_all" on public.venue_tables for select using (true);
create policy "venue_tables_manage_patron" on public.venue_tables for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));

-- FK on reservations (if not already added)
do $$ begin
  alter table public.reservations add constraint reservations_table_id_fkey
    foreign key (table_id) references public.venue_tables(id);
exception when duplicate_object then null;
end $$;

-- Seed: Le Hive floor plan
insert into public.venue_tables (id, zone, capacity, max_capacity, table_type, sort_order) values
  -- Restaurant
  ('400', 'restaurant', 4, 6, 'standard', 1),
  ('410', 'restaurant', 8, 10, 'standard', 2),
  ('420', 'restaurant', 8, 10, 'standard', 3),
  ('430', 'restaurant', 2, 2, 'standard', 4),
  ('440', 'restaurant', 4, 4, 'standard', 5),
  ('450', 'restaurant', 4, 4, 'standard', 6),
  ('460', 'restaurant', 4, 5, 'standard', 7),
  ('470', 'restaurant', 6, 8, 'standard', 8),
  ('480', 'restaurant', 4, 5, 'standard', 9),
  ('490', 'restaurant', 6, 6, 'standard', 10),
  -- Terrasse
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
  ('160', 'terrasse', 2, 2, 'standard', 13),
  -- Terrasse couverte
  ('300', 'terrasse_couverte', 2, 2, 'high', 1),
  ('310', 'terrasse_couverte', 2, 2, 'high', 2),
  ('320', 'terrasse_couverte', 2, 2, 'standard', 3),
  ('330', 'terrasse_couverte', 2, 2, 'standard', 4),
  ('340', 'terrasse_couverte', 2, 2, 'standard', 5),
  -- Bar
  ('50', 'bar', 6, 6, 'standard', 1),
  ('60', 'bar', 6, 6, 'standard', 2),
  ('70', 'bar', 6, 6, 'standard', 3),
  ('80', 'bar', 4, 4, 'standard', 4),
  ('90', 'bar', 4, 4, 'standard', 5)
on conflict (id) do nothing;


-- ────────────────────────────────────────────────────────────
-- 15. STOCK PRODUCTS
-- ────────────────────────────────────────────────────────────

create table if not exists public.stock_products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null check (category in ('spiritueux', 'sirops_cocktails', 'bieres', 'vins', 'champagnes', 'softs', 'consommables')),
  domain text not null check (domain in ('boissons', 'vins')),
  unit text not null default 'bouteille',
  current_stock numeric(6,2) not null default 0,
  min_stock numeric(6,2) not null default 1,
  bottle_size text,
  cost_price numeric(8,2),
  supplier text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.stock_products enable row level security;
create policy "stock_products_select_all" on public.stock_products for select using (true);
create policy "stock_products_manage_patron" on public.stock_products for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "stock_products_update_patron" on public.stock_products for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "stock_products_delete_patron" on public.stock_products for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "stock_products_update_responsable" on public.stock_products for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'responsable'
    and stock_domain = (select domain from public.stock_products sp where sp.id = stock_products.id)
  ));


-- ────────────────────────────────────────────────────────────
-- 16. STOCK MOVEMENTS
-- ────────────────────────────────────────────────────────────

create table if not exists public.stock_movements (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.stock_products not null,
  type text not null check (type in ('opened', 'inventory', 'received', 'adjustment')),
  quantity numeric(6,2) not null,
  level numeric(3,2),
  note text,
  created_by uuid references public.profiles not null,
  created_at timestamptz not null default now()
);

alter table public.stock_movements enable row level security;
create policy "stock_movements_select_all" on public.stock_movements for select using (true);
create policy "stock_movements_insert_all" on public.stock_movements for insert with check (auth.uid() is not null);


-- ────────────────────────────────────────────────────────────
-- 17. STOCK ORDERS
-- ────────────────────────────────────────────────────────────

create table if not exists public.stock_orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.stock_products not null,
  quantity_needed numeric(6,2),
  status text not null default 'pending' check (status in ('pending', 'ordered', 'received')),
  delivery_date date,
  created_by uuid references public.profiles not null,
  created_at timestamptz not null default now()
);

alter table public.stock_orders enable row level security;
create policy "stock_orders_select_all" on public.stock_orders for select using (true);
create policy "stock_orders_insert_manager" on public.stock_orders for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('patron', 'responsable')));
create policy "stock_orders_update_manager" on public.stock_orders for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('patron', 'responsable')));
create policy "stock_orders_delete_manager" on public.stock_orders for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('patron', 'responsable')));


-- ────────────────────────────────────────────────────────────
-- 18. STOCK ALERTS
-- ────────────────────────────────────────────────────────────

create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.stock_products not null,
  message text,
  created_by uuid references public.profiles not null,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.stock_alerts enable row level security;
create policy "stock_alerts_select_all" on public.stock_alerts for select using (true);
create policy "stock_alerts_insert_all" on public.stock_alerts for insert with check (auth.uid() is not null);
create policy "stock_alerts_update_manager" on public.stock_alerts for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('patron', 'responsable')));


-- ────────────────────────────────────────────────────────────
-- 19. ONBOARDING
-- ────────────────────────────────────────────────────────────

create table if not exists public.onboarding_docs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null check (category in ('rules', 'hygiene', 'service', 'menu', 'conduct')),
  sort_order int not null default 0,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.onboarding_docs enable row level security;
create policy "onboarding_docs_select_all" on public.onboarding_docs for select using (true);
create policy "onboarding_docs_manage_patron" on public.onboarding_docs for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "onboarding_docs_update_patron" on public.onboarding_docs for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "onboarding_docs_delete_patron" on public.onboarding_docs for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));

create table if not exists public.onboarding_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  doc_id uuid references public.onboarding_docs not null,
  signed_name text not null,
  completed_at timestamptz not null default now(),
  unique(user_id, doc_id)
);

alter table public.onboarding_completions enable row level security;
create policy "onboarding_completions_select" on public.onboarding_completions for select
  using (user_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "onboarding_completions_insert_own" on public.onboarding_completions for insert
  with check (user_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- ENABLE REALTIME on key tables
-- ────────────────────────────────────────────────────────────
-- Note: task_completions, reservations, messages already added above.
-- Add tasks for patron dashboard sync:
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.one_off_tasks;
alter publication supabase_realtime add table public.debriefs;

-- ────────────────────────────────────────────────────────────
-- Rituals — recurring weekly activities shown in "Ce Soir"
-- ────────────────────────────────────────────────────────────

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

create policy "rituals_select_all" on public.rituals for select using (true);
create policy "rituals_insert_patron" on public.rituals for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "rituals_update_patron" on public.rituals for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "rituals_delete_patron" on public.rituals for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));

-- ────────────────────────────────────────────────────────────
-- Floor plan layout — drawn spaces + table positions
-- Coordinates use an abstract 1000x700 canvas (SVG viewBox).
-- ────────────────────────────────────────────────────────────

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

alter table public.venue_tables add column if not exists x integer not null default 100;
alter table public.venue_tables add column if not exists y integer not null default 100;
alter table public.venue_tables add column if not exists space_id uuid references public.venue_spaces on delete set null;
