-- ============================================================
-- Block extras from creating / deleting reservations
--
-- Vision: temporary staff (employment_type = 'extra') don't have
-- enough context on the night's book to safely take a NEW reservation.
--
-- Updates stay open to all authenticated users — extras still need
-- to mark arrivals at the door, change table assignment in the heat
-- of service, etc. Process discipline (training, audit log on
-- created_by/arrived_by) catches misuse.
-- ============================================================

drop policy if exists "reservations_insert_all" on public.reservations;
drop policy if exists "reservations_delete_all" on public.reservations;

create policy "reservations_insert_non_extra"
  on public.reservations for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and coalesce(employment_type, 'permanent') != 'extra'
    )
  );

create policy "reservations_delete_non_extra"
  on public.reservations for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and coalesce(employment_type, 'permanent') != 'extra'
    )
  );

-- reservations_update_all is preserved (any auth user can mark arrived,
-- adjust table, etc. — UI gates by role for everything else)
