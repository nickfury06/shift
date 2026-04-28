-- ============================================================
-- Suggestions — staff idea box
--
-- Vision: anyone (staff, responsable, even extras) can drop ideas
-- for service improvements, menu tweaks, organisation gaps. Patron
-- reviews on /admin and either accepts, rejects, or marks as
-- implemented. Optional resolution_notes lets the patron explain
-- the decision.
-- ============================================================

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  category text not null check (category in ('service', 'menu', 'organisation', 'autre')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'implemented')),
  created_by uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles on delete set null,
  resolved_at timestamptz,
  resolution_notes text
);

create index if not exists suggestions_status_idx on public.suggestions (status);
create index if not exists suggestions_created_at_idx on public.suggestions (created_at desc);

alter table public.suggestions enable row level security;

-- Anyone authenticated reads (transparency: staff sees what's been
-- suggested, what's implemented, learns from the decisions)
create policy "suggestions_select_all"
  on public.suggestions for select
  using (auth.uid() is not null);

-- Anyone authenticated can submit
create policy "suggestions_insert_own"
  on public.suggestions for insert
  with check (created_by = auth.uid());

-- Patron resolves (accept / reject / implemented). Author can also
-- delete their own pending suggestion if they want to retract it.
create policy "suggestions_update_patron"
  on public.suggestions for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

create policy "suggestions_delete_own_or_patron"
  on public.suggestions for delete
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

alter publication supabase_realtime add table public.suggestions;
