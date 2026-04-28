-- ============================================================
-- Allow responsables to manage tasks IN THEIR DEPARTMENT
--
-- Previously: only patron could insert/update/delete tasks.
-- Now: a responsable with department = 'bar' can manage tasks where
-- zone = 'bar', and a responsable with department = 'salle' can
-- manage tasks where zone in ('terrasse', 'restaurant').
-- Patron retains full control.
-- ============================================================

-- Helper: returns true if the calling user is allowed to write the
-- given task zone. Used by both tasks and one_off_tasks policies.
create or replace function public.user_can_write_task_zone(target_zone text)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and (
      p.role = 'patron'
      or (
        p.role = 'responsable'
        and (
          (p.department = 'bar' and target_zone = 'bar')
          or (p.department = 'salle' and target_zone in ('terrasse', 'restaurant'))
        )
      )
    )
  );
$$;

-- ── tasks ────────────────────────────────────────────────────
drop policy if exists "tasks_insert_patron" on public.tasks;
drop policy if exists "tasks_update_patron" on public.tasks;
drop policy if exists "tasks_delete_patron" on public.tasks;

create policy "tasks_insert_role"
  on public.tasks for insert
  with check (public.user_can_write_task_zone(zone));

create policy "tasks_update_role"
  on public.tasks for update
  using (public.user_can_write_task_zone(zone))
  with check (public.user_can_write_task_zone(zone));

create policy "tasks_delete_role"
  on public.tasks for delete
  using (public.user_can_write_task_zone(zone));

-- ── one_off_tasks ────────────────────────────────────────────
drop policy if exists "one_off_tasks_insert_patron" on public.one_off_tasks;
drop policy if exists "one_off_tasks_update_patron" on public.one_off_tasks;
drop policy if exists "one_off_tasks_delete_patron" on public.one_off_tasks;

create policy "one_off_tasks_insert_role"
  on public.one_off_tasks for insert
  with check (public.user_can_write_task_zone(zone));

create policy "one_off_tasks_update_role"
  on public.one_off_tasks for update
  using (public.user_can_write_task_zone(zone))
  with check (public.user_can_write_task_zone(zone));

create policy "one_off_tasks_delete_role"
  on public.one_off_tasks for delete
  using (public.user_can_write_task_zone(zone));
