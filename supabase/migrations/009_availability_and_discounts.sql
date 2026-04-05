-- ============================================================
-- Availability Requests — staff signals unavailability
-- ============================================================

create table public.availability_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles not null,
  date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'refused')),
  created_at timestamptz not null default now()
);

alter table public.availability_requests enable row level security;

-- Staff can insert their own requests
create policy "availability_requests_insert_own"
  on public.availability_requests for insert
  with check (user_id = auth.uid());

-- Staff can read their own, patrons can read all
create policy "availability_requests_select"
  on public.availability_requests for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

-- Patrons can update (accept/refuse)
create policy "availability_requests_update_patron"
  on public.availability_requests for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

-- ============================================================
-- Discount Requests — staff family/friends discount invites
-- ============================================================

create table public.discount_requests (
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

create policy "discount_requests_insert_own"
  on public.discount_requests for insert
  with check (user_id = auth.uid());

create policy "discount_requests_select"
  on public.discount_requests for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "discount_requests_update_patron"
  on public.discount_requests for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

-- ============================================================
-- Settings — configurable app settings (e.g. discount frequency)
-- ============================================================

create table public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "settings_select_all"
  on public.settings for select
  using (true);

create policy "settings_upsert_patron"
  on public.settings for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "settings_update_patron"
  on public.settings for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

-- Default settings
insert into public.settings (key, value) values
  ('discount_frequency', 'monthly'),
  ('discount_max_per_period', '1');
