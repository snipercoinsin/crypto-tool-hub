
DROP POLICY IF EXISTS "tools_public_read" ON public.tools;
DROP POLICY IF EXISTS "orders_public_read" ON public.orders;
DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
DROP POLICY IF EXISTS "settings_public_read_addresses" ON public.settings;

REVOKE ALL ON public.tools FROM anon, authenticated;
REVOKE ALL ON public.orders FROM anon, authenticated;
REVOKE ALL ON public.settings FROM anon, authenticated;
