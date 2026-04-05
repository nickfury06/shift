-- ============================================================
-- Task Completions — tracks who completed what task on which shift
-- ============================================================

create table public.task_completions (
  id uuid default gen_random_uuid() primary key,
  task_id uuid not null,
  task_type text not null check (task_type in ('recurring', 'one_off')),
  shift_date date not null,
  completed_by uuid references public.profiles not null,
  moment text not null check (moment in ('ouverture', 'service', 'fermeture')),
  completed_at timestamptz not null default now(),
  unique (task_id, shift_date, completed_by)
);

alter table public.task_completions enable row level security;

-- Everyone can read completions (needed for progress tracking)
create policy "task_completions_select_all"
  on public.task_completions for select
  using (true);

-- Authenticated users can insert their own completions
create policy "task_completions_insert_own"
  on public.task_completions for insert
  with check (completed_by = auth.uid());

-- Users can delete their own completions (uncheck)
create policy "task_completions_delete_own"
  on public.task_completions for delete
  using (completed_by = auth.uid());

-- Enable realtime for task_completions
alter publication supabase_realtime add table public.task_completions;
