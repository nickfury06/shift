-- ============================================================
-- Onboarding documents + completions
-- ============================================================

create table public.onboarding_docs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null check (category in ('rules', 'hygiene', 'service', 'menu', 'conduct')),
  sort_order int not null default 0,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.onboarding_docs enable row level security;
create policy "onboarding_docs_select_all" on public.onboarding_docs for select using (true);
create policy "onboarding_docs_manage_patron" on public.onboarding_docs for insert with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "onboarding_docs_update_patron" on public.onboarding_docs for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "onboarding_docs_delete_patron" on public.onboarding_docs for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));

create table public.onboarding_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  doc_id uuid references public.onboarding_docs not null,
  signed_name text not null,
  completed_at timestamptz not null default now(),
  unique(user_id, doc_id)
);

alter table public.onboarding_completions enable row level security;
create policy "onboarding_completions_select" on public.onboarding_completions for select using (user_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "onboarding_completions_insert_own" on public.onboarding_completions for insert with check (user_id = auth.uid());

-- Add onboarding flag to profiles
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
