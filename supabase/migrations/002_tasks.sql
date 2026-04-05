-- ============================================================
-- Tasks — recurring daily checklists
-- ============================================================

create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  note text,
  zone text not null check (zone in (
    'terrasse', 'terrasse_wc', 'restaurant',
    'bar_escaliers', 'bar_salle', 'bar_gaming', 'bar_backbar', 'bar_reserve'
  )),
  moment text not null check (moment in ('ouverture', 'service', 'fermeture')),
  assigned_to uuid[] not null default '{}',
  days text[] not null default '{}',
  priority int not null default 3 check (priority between 1 and 5),
  is_reminder boolean not null default false,
  is_libre boolean not null default false,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.tasks enable row level security;

-- Everyone can read tasks (filtering by assignment happens in app)
create policy "tasks_select_all"
  on public.tasks for select
  using (true);

-- Only patrons can create/update/delete
create policy "tasks_insert_patron"
  on public.tasks for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "tasks_update_patron"
  on public.tasks for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "tasks_delete_patron"
  on public.tasks for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

-- ============================================================
-- One-off Tasks — specific date tasks
-- ============================================================

create table public.one_off_tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  note text,
  zone text not null check (zone in (
    'terrasse', 'terrasse_wc', 'restaurant',
    'bar_escaliers', 'bar_salle', 'bar_gaming', 'bar_backbar', 'bar_reserve'
  )),
  moment text not null check (moment in ('ouverture', 'service', 'fermeture')),
  assigned_to uuid[] not null default '{}',
  date date not null,
  priority int not null default 3 check (priority between 1 and 5),
  is_reminder boolean not null default false,
  is_libre boolean not null default false,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now()
);

alter table public.one_off_tasks enable row level security;

create policy "one_off_tasks_select_all"
  on public.one_off_tasks for select
  using (true);

create policy "one_off_tasks_insert_patron"
  on public.one_off_tasks for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "one_off_tasks_update_patron"
  on public.one_off_tasks for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "one_off_tasks_delete_patron"
  on public.one_off_tasks for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );
