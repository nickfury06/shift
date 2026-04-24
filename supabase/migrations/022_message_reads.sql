-- ============================================================
-- Message read receipts
--
-- Audit trail for message acknowledgement. Every time a user sees
-- a message in their UI, the client upserts (message_id, user_id)
-- here with a server-side timestamp.
--
-- Patron can then see on each message "5/7 have read" with a list
-- of who hasn't yet — supports real accountability for important
-- notes (house rules, safety, service consignes).
-- ============================================================

create table if not exists public.message_reads (
  message_id uuid not null references public.messages on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_reads_user_idx on public.message_reads (user_id);
create index if not exists message_reads_message_idx on public.message_reads (message_id);

alter table public.message_reads enable row level security;

-- Everyone can see who has read what (patron needs this for the
-- "5/7 ont lu" counter; staff also benefits from seeing that a
-- teammate already saw the note)
create policy "message_reads_select_all"
  on public.message_reads for select
  using (true);

-- A user can only mark THEIR OWN reads
create policy "message_reads_insert_own"
  on public.message_reads for insert
  with check (user_id = auth.uid());

-- Realtime — patron sees the counter update live as team members
-- open the app
alter publication supabase_realtime add table public.message_reads;
