-- ============================================================
-- Department field on profiles
--
-- Splits the existing flat role model into role × department so the
-- UI and RLS can differentiate bar-side staff from salle-side staff.
--
--   patron      → department = null (omnipotent, both sides)
--   responsable → department = 'bar' (Benjamin) or 'salle' (Maxime)
--   staff       → department = 'bar' or 'salle' (permanent + extra)
--
-- `stock_domain` stays alongside — it's more specific (boissons vs
-- vins under the "bar" responsable's scope).
-- ============================================================

alter table public.profiles
  add column if not exists department text
    check (department in ('bar', 'salle') or department is null);

create index if not exists profiles_department_idx on public.profiles (department);
