-- ============================================================
-- Stock Products — individual bottles/items
-- ============================================================

create table public.stock_products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null check (category in ('spiritueux', 'bieres', 'vins', 'softs', 'autres')),
  domain text not null check (domain in ('boissons', 'vins')),
  unit text not null default 'bouteille',
  current_stock numeric(6,2) not null default 0,
  min_stock numeric(6,2) not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.stock_products enable row level security;

-- Everyone can read stock
create policy "stock_products_select_all" on public.stock_products for select using (true);

-- Patrons can manage products
create policy "stock_products_manage_patron" on public.stock_products for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "stock_products_update_patron" on public.stock_products for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));
create policy "stock_products_delete_patron" on public.stock_products for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'patron'));

-- Responsables can update stock levels (for their domain)
create policy "stock_products_update_responsable" on public.stock_products for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'responsable'
      and stock_domain = (select domain from public.stock_products sp where sp.id = stock_products.id)
    )
  );

-- ============================================================
-- Stock Movements — tracks every change (opened bottle, inventory count, etc.)
-- ============================================================

create table public.stock_movements (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.stock_products not null,
  type text not null check (type in ('opened', 'inventory', 'received', 'adjustment')),
  quantity numeric(6,2) not null, -- negative for consumption, positive for receiving
  level numeric(3,2), -- bottle level for inventory (0.25, 0.5, 0.75, 1.0)
  note text,
  created_by uuid references public.profiles not null,
  created_at timestamptz not null default now()
);

alter table public.stock_movements enable row level security;

-- Everyone can read movements
create policy "stock_movements_select_all" on public.stock_movements for select using (true);

-- All authenticated users can log movements (staff opens bottles too)
create policy "stock_movements_insert_all" on public.stock_movements for insert
  with check (auth.uid() is not null);
