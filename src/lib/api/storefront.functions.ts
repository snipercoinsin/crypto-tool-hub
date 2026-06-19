// Public storefront server functions.
import { createServerFn } from "@tanstack/react-start";

export type ToolCard = {
  id: string;
  name: string;
  description: string;
  price_usd: number;
  image_url: string | null;
  video_url: string | null;
  youtube_url: string | null;
  category_id: string | null;
  category_name: string | null;
};

export type CategoryDTO = { id: string; name: string; sort_order: number };

async function signed(path: string | null, bucket: string): Promise<string | null> {
  if (!path) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export const listTools = createServerFn({ method: "GET" }).handler(async (): Promise<ToolCard[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("tools")
    .select("id,name,description,price_usd,image_url,video_url,youtube_url,category_id,categories(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const out: ToolCard[] = [];
  for (const t of data ?? []) {
    const cat = (t as { categories: { name: string } | null }).categories;
    out.push({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      price_usd: Number(t.price_usd),
      image_url: await signed(t.image_url, "tool-images"),
      video_url: await signed(t.video_url, "tool-videos"),
      youtube_url: t.youtube_url,
      category_id: t.category_id ?? null,
      category_name: cat?.name ?? null,
    });
  }
  return out;
});

export const listCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<CategoryDTO[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("id,name,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((c) => ({ id: c.id, name: c.name, sort_order: c.sort_order }));
  },
);
