-- ============================================================
-- Allow deleting a table without FK-blocking reservations.
--
-- Before: `reservations.table_id` FK had no ON DELETE clause, so any
-- existing reservation referencing a table blocked its deletion with
-- "Key (id)=(…) is still referenced from table reservations".
--
-- After: deleting a table nulls out the table_id on its reservations
-- instead of failing. The reservation itself survives — it just loses
-- its assignment, which is the behavior patrons already expect (we
-- warn them in the delete-table confirm dialog).
-- ============================================================

alter table public.reservations
  drop constraint if exists reservations_table_id_fkey;

alter table public.reservations
  add constraint reservations_table_id_fkey
  foreign key (table_id) references public.venue_tables(id) on delete set null;
