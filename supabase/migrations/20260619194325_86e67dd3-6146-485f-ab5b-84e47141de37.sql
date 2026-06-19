CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_anon_auth" ON public.categories
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.tools
  ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX tools_category_id_idx ON public.tools(category_id);

INSERT INTO public.categories (name, sort_order) VALUES
  ('Electronic Tools', 1),
  ('Digital Tools', 2),
  ('Cryptocurrencies', 3),
  ('Clothing', 4);
