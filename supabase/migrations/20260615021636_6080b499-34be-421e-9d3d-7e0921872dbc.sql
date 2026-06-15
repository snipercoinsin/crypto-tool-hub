
-- Revoke direct table access from public-facing roles. Service role bypasses RLS and is used by server functions.
REVOKE ALL ON public.tools FROM anon, authenticated;
REVOKE ALL ON public.orders FROM anon, authenticated;
REVOKE ALL ON public.settings FROM anon, authenticated;

-- Explicit restrictive deny policies as defense-in-depth.
DROP POLICY IF EXISTS "deny_all_anon_auth" ON public.tools;
CREATE POLICY "deny_all_anon_auth" ON public.tools
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_anon_auth" ON public.orders;
CREATE POLICY "deny_all_anon_auth" ON public.orders
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_anon_auth" ON public.settings;
CREATE POLICY "deny_all_anon_auth" ON public.settings
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- Storage: deny anon + authenticated direct access to all three private buckets.
-- Service role bypasses RLS and serves files via createSignedUrl from server functions.
DROP POLICY IF EXISTS "deny_anon_auth_tool_zips" ON storage.objects;
CREATE POLICY "deny_anon_auth_tool_zips" ON storage.objects
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (bucket_id <> 'tool-zips')
  WITH CHECK (bucket_id <> 'tool-zips');

DROP POLICY IF EXISTS "deny_anon_auth_tool_images" ON storage.objects;
CREATE POLICY "deny_anon_auth_tool_images" ON storage.objects
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (bucket_id <> 'tool-images')
  WITH CHECK (bucket_id <> 'tool-images');

DROP POLICY IF EXISTS "deny_anon_auth_tool_videos" ON storage.objects;
CREATE POLICY "deny_anon_auth_tool_videos" ON storage.objects
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (bucket_id <> 'tool-videos')
  WITH CHECK (bucket_id <> 'tool-videos');
