-- ============================================================
-- Reservations — bookings for the venue
-- ============================================================

create table public.reservations (
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
  created_by uuid references public.profiles not null,
  created_at timestamptz not null default now()
);

alter table public.reservations enable row level security;

-- All authenticated users can CRUD reservations
create policy "reservations_select_all"
  on public.reservations for select
  using (true);

create policy "reservations_insert_all"
  on public.reservations for insert
  with check (auth.uid() is not null);

create policy "reservations_update_all"
  on public.reservations for update
  using (auth.uid() is not null);

create policy "reservations_delete_all"
  on public.reservations for delete
  using (auth.uid() is not null);

-- Enable realtime for reservations
alter publication supabase_realtime add table public.reservations;
