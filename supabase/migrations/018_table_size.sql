-- ============================================================
-- Per-table visual size (radius in SVG viewBox units)
-- Allows patron to make larger tables visually bigger on the plan.
-- Range enforced in UI, not DB, to stay flexible.
-- ============================================================

alter table public.venue_tables add column if not exists radius integer not null default 24;
