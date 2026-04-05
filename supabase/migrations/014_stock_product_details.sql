-- Add product details columns
alter table public.stock_products add column bottle_size text;
alter table public.stock_products add column cost_price numeric(8,2);
alter table public.stock_products add column supplier text;

-- Fix outdated category constraint
alter table public.stock_products drop constraint if exists stock_products_category_check;
alter table public.stock_products add constraint stock_products_category_check
  check (category in ('spiritueux', 'sirops_cocktails', 'bieres', 'vins', 'champagnes', 'softs', 'consommables'));
