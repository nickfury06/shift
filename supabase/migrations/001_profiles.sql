-- ============================================================
-- Profiles — extends auth.users with Le Hive specific fields
-- ============================================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  role text not null check (role in ('patron', 'responsable', 'staff')),
  stock_domain text check (stock_domain in ('boissons', 'vins') or stock_domain is null),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email, coalesce(new.raw_user_meta_data->>'role', 'staff'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

-- Everyone can read all profiles (needed for names in UI)
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- Patrons can insert/update/delete
create policy "profiles_insert_patron"
  on public.profiles for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "profiles_update_patron"
  on public.profiles for update
  using (
    -- Patron can update anyone, user can update own (for password change flag)
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
    or id = auth.uid()
  );

create policy "profiles_delete_patron"
  on public.profiles for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );
