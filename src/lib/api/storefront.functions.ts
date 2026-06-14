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
};

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
    .select("id,name,description,price_usd,image_url,video_url,youtube_url")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const out: ToolCard[] = [];
  for (const t of data ?? []) {
    out.push({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      price_usd: Number(t.price_usd),
      image_url: await signed(t.image_url, "tool-images"),
      video_url: await signed(t.video_url, "tool-videos"),
      youtube_url: t.youtube_url,
    });
  }
  return out;
});
