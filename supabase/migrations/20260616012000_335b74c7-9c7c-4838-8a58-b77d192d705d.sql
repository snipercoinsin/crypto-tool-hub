DROP POLICY IF EXISTS "site_assets_deny" ON storage.objects;
CREATE POLICY "site_assets_deny" ON storage.objects
  AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (bucket_id <> 'site-assets' OR false)
  WITH CHECK (bucket_id <> 'site-assets' OR false);