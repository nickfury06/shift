-- ============================================================
-- Floor plan background image
--
-- Patron can upload a photo/blueprint of the venue; the FloorPlan
-- component renders it behind the spaces + tables as a tracing guide.
-- Stored in a public Storage bucket; URL + opacity stored in settings.
-- ============================================================

-- Create public bucket (idempotent)
insert into storage.buckets (id, name, public)
values ('venue-assets', 'venue-assets', true)
on conflict (id) do nothing;

-- Anyone can read (so the image loads for staff without auth hops)
drop policy if exists "venue_assets_read" on storage.objects;
create policy "venue_assets_read"
  on storage.objects for select
  using (bucket_id = 'venue-assets');

-- Only patron can upload / update / delete
drop policy if exists "venue_assets_patron_insert" on storage.objects;
create policy "venue_assets_patron_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'venue-assets'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

drop policy if exists "venue_assets_patron_update" on storage.objects;
create policy "venue_assets_patron_update"
  on storage.objects for update
  using (
    bucket_id = 'venue-assets'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );

drop policy if exists "venue_assets_patron_delete" on storage.objects;
create policy "venue_assets_patron_delete"
  on storage.objects for delete
  using (
    bucket_id = 'venue-assets'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'patron')
  );
