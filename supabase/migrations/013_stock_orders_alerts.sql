-- ============================================================
-- Stock Orders — shopping list for France Boissons
-- ============================================================

create table public.stock_orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.stock_products not null,
  quantity_needed numeric(6,2),
  status text not null default 'pending' check (status in ('pending', 'ordered', 'received')),
  delivery_date date,
  created_by uuid references public.profiles not null,
  created_at timestamptz not null default now()
);

alter table public.stock_orders enable row level security;
create policy "stock_orders_select_all" on public.stock_orders for select using (true);
create policy "stock_orders_insert_manager" on public.stock_orders for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('patron', 'responsable')));
create policy "stock_orders_update_manager" on public.stock_orders for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('patron', 'responsable')));
create policy "stock_orders_delete_manager" on public.stock_orders for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('patron', 'responsable')));

-- ============================================================
-- Stock Alerts — staff flags something as low during service
-- ============================================================

create table public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.stock_products not null,
  message text,
  created_by uuid references public.profiles not null,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.stock_alerts enable row level security;
create policy "stock_alerts_select_all" on public.stock_alerts for select using (true);
create policy "stock_alerts_insert_all" on public.stock_alerts for insert
  with check (auth.uid() is not null);
create policy "stock_alerts_update_manager" on public.stock_alerts for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('patron', 'responsable')));
