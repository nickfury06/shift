-- ============================================================
-- Debriefs — structured end-of-shift feedback
-- ============================================================

create table public.debriefs (
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

-- Staff can insert their own debrief
create policy "debriefs_insert_own"
  on public.debriefs for insert
  with check (user_id = auth.uid());

-- Staff can read their own, patrons and responsables can read all
create policy "debriefs_select"
  on public.debriefs for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('patron', 'responsable')
    )
  );
