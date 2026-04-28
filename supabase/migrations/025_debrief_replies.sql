-- ============================================================
-- Debrief replies — patron / responsable comment threads on debriefs
--
-- Vision: a debrief is INSERT-only (no edit). When the patron wants
-- to give feedback ("good catch on the rosé rupture", "next time tell
-- the runner before opening the second bottle"), they post a reply
-- below the debrief. The author of the debrief sees the reply when
-- they next open /debrief.
-- ============================================================

create table if not exists public.debrief_replies (
  id uuid primary key default gen_random_uuid(),
  debrief_id uuid not null references public.debriefs on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists debrief_replies_debrief_idx on public.debrief_replies (debrief_id);

alter table public.debrief_replies enable row level security;

-- Anyone authenticated can read (the debrief author + patron need it)
create policy "debrief_replies_select_all"
  on public.debrief_replies for select
  using (auth.uid() is not null);

-- Patron + responsable can post replies. Staff can also reply on their
-- OWN debriefs (acknowledge feedback), but not on others'.
create policy "debrief_replies_insert"
  on public.debrief_replies for insert
  with check (
    user_id = auth.uid()
    and (
      exists (select 1 from public.profiles where id = auth.uid() and role in ('patron', 'responsable'))
      or exists (
        select 1 from public.debriefs d
        where d.id = debrief_id
        and d.user_id = auth.uid()
      )
    )
  );

-- Author of the reply can delete their own
create policy "debrief_replies_delete_own"
  on public.debrief_replies for delete
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.debrief_replies;
