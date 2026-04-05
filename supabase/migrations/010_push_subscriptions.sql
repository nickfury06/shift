-- ============================================================
-- Push Subscriptions — web push notification endpoints
-- ============================================================

create table public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles not null,
  endpoint text not null,
  keys jsonb not null, -- { p256dh, auth }
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

-- Users can manage their own subscriptions
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());

-- Service role can read all (for sending notifications server-side)
-- This is handled by using service_role key in the API route
