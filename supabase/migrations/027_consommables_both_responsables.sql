-- ============================================================
-- Both responsables can manage `consommables` products
--
-- Vision: ménager + consommables are bought on Metro by Benjamin in
-- 95% of cases, but Maxime needs to be able to signal a need (and
-- update stock levels) when Benjamin isn't around. Domain still
-- gates spiritueux, vins, etc. — only `category = 'consommables'`
-- is shared.
-- ============================================================

drop policy if exists "stock_products_update_responsable" on public.stock_products;

create policy "stock_products_update_responsable"
  on public.stock_products for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'responsable'
      and (
        -- domain match (existing behavior)
        p.stock_domain = (select sp.domain from public.stock_products sp where sp.id = stock_products.id)
        -- OR the product is a shared consommable
        or (select sp.category from public.stock_products sp where sp.id = stock_products.id) = 'consommables'
      )
    )
  );
