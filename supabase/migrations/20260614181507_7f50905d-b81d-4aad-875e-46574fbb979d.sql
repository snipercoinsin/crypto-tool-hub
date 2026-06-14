
-- TOOLS
CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_usd NUMERIC(12,2) NOT NULL CHECK (price_usd >= 0),
  image_url TEXT,
  video_url TEXT,
  youtube_url TEXT,
  zip_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tools TO anon, authenticated;
GRANT ALL ON public.tools TO service_role;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tools_public_read" ON public.tools FOR SELECT USING (true);

-- ORDERS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('BTC','XMR')),
  price_usd NUMERIC(12,2) NOT NULL,
  crypto_amount NUMERIC(24,12) NOT NULL,
  deposit_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired')),
  paid_txid TEXT,
  download_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32),'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  paid_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_public_read" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders_public_insert" ON public.orders FOR INSERT WITH CHECK (true);

-- SETTINGS
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read_addresses" ON public.settings
  FOR SELECT USING (key IN ('btc_address','xmr_address'));

INSERT INTO public.settings(key,value) VALUES
  ('btc_address',''),
  ('xmr_address','')
ON CONFLICT DO NOTHING;
