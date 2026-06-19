// Admin server functions: login, manage tools/orders/settings.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { verifyAdminPassword, getAdminSession } = await import("@/lib/admin.server");
    // Tolerate accidental surrounding whitespace from copy/paste or mobile keyboards
    const pw = data.password.trim();
    if (!(await verifyAdminPassword(pw))) {
      // Slow down brute force a bit
      await new Promise((r) => setTimeout(r, 700));
      throw new Error("Invalid password");
    }
    const sess = await getAdminSession();
    await sess.update({ isAdmin: true, loggedAt: Date.now() });
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getAdminSession } = await import("@/lib/admin.server");
  const sess = await getAdminSession();
  await sess.clear();
  return { ok: true };
});

export const adminMe = createServerFn({ method: "GET" }).handler(async () => {
  const { getAdminSession } = await import("@/lib/admin.server");
  const sess = await getAdminSession();
  return { isAdmin: !!sess.data.isAdmin };
});

// Settings
export const adminGetSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("@/lib/admin.server");
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("settings").select("key,value");
  const m = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return { btc_address: m.btc_address ?? "", xmr_address: m.xmr_address ?? "" };
});

export const adminSaveSettings = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ btc_address: z.string().max(200), xmr_address: z.string().max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("settings")
      .upsert([
        { key: "btc_address", value: data.btc_address.trim(), updated_at: new Date().toISOString() },
        { key: "xmr_address", value: data.xmr_address.trim(), updated_at: new Date().toISOString() },
      ]);
    return { ok: true };
  });

// Tools
export const adminListTools = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("@/lib/admin.server");
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tools")
    .select("id,name,price_usd,created_at,zip_path")
    .order("created_at", { ascending: false });
  return data ?? [];
});

// Signed upload URLs so the browser can PUT files directly to storage.
const uploadSchema = z.object({
  imageName: z.string().max(200).optional(),
  videoName: z.string().max(200).optional(),
  zipName: z.string().max(200),
});

export const adminGetUploadUrls = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => uploadSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    function pathFor(name: string) {
      const rand = crypto.randomUUID();
      const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
      return `${rand}-${safe}`;
    }

    const out: {
      image?: { path: string; token: string };
      video?: { path: string; token: string };
      zip: { path: string; token: string };
    } = { zip: { path: "", token: "" } };

    if (data.imageName) {
      const p = pathFor(data.imageName);
      const { data: s, error } = await supabaseAdmin.storage.from("tool-images").createSignedUploadUrl(p);
      if (error || !s) { console.error("[upload image url]", error); throw new Error("Image upload URL failed"); }
      out.image = { path: p, token: s.token };
    }
    if (data.videoName) {
      const p = pathFor(data.videoName);
      const { data: s, error } = await supabaseAdmin.storage.from("tool-videos").createSignedUploadUrl(p);
      if (error || !s) { console.error("[upload video url]", error); throw new Error("Video upload URL failed"); }
      out.video = { path: p, token: s.token };
    }
    {
      const p = pathFor(data.zipName);
      const { data: s, error } = await supabaseAdmin.storage.from("tool-zips").createSignedUploadUrl(p);
      if (error || !s) { console.error("[upload zip url]", error); throw new Error("Zip upload URL failed"); }
      out.zip = { path: p, token: s.token };
    }
    return out;
  });

const createToolSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).default(""),
  price_usd: z.number().nonnegative().max(1_000_000),
  image_path: z.string().nullable().optional(),
  video_path: z.string().nullable().optional(),
  youtube_url: z.string().url().max(500).nullable().optional(),
  zip_path: z.string().min(1).max(500),
  category_id: z.string().uuid().nullable().optional(),
});

export const adminCreateTool = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createToolSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("tools").insert({
      name: data.name,
      description: data.description,
      price_usd: data.price_usd,
      image_url: data.image_path ?? null,
      video_url: data.video_path ?? null,
      youtube_url: data.youtube_url ?? null,
      zip_path: data.zip_path,
      category_id: data.category_id ?? null,
    });
    if (error) { console.error("[adminCreateTool]", error); throw new Error("Could not create tool"); }
    return { ok: true };
  });

// Categories
export const adminListCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("@/lib/admin.server");
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id,name,sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const adminCreateCategory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().min(1).max(100), sort_order: z.number().int().min(0).max(9999).default(0) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("categories")
      .insert({ name: data.name.trim(), sort_order: data.sort_order });
    if (error) { console.error("[adminCreateCategory]", error); throw new Error(error.message || "Could not create category"); }
    return { ok: true };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
    if (error) { console.error("[adminDeleteCategory]", error); throw new Error("Could not delete category"); }
    return { ok: true };
  });


export const adminDeleteTool = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tool } = await supabaseAdmin
      .from("tools")
      .select("image_url,video_url,zip_path")
      .eq("id", data.id)
      .single();
    if (tool) {
      if (tool.image_url) await supabaseAdmin.storage.from("tool-images").remove([tool.image_url]);
      if (tool.video_url) await supabaseAdmin.storage.from("tool-videos").remove([tool.video_url]);
      if (tool.zip_path) await supabaseAdmin.storage.from("tool-zips").remove([tool.zip_path]);
    }
    await supabaseAdmin.from("tools").delete().eq("id", data.id);
    return { ok: true };
  });

// Orders
export const adminListOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("@/lib/admin.server");
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("orders")
    .select("id,email,currency,price_usd,crypto_amount,deposit_address,status,created_at,expires_at,paid_txid,ip_address,country_code,tools(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
});


export const adminConfirmOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString(), paid_txid: "manual" })
      .eq("id", data.id);
    if (error) { console.error("[adminConfirmOrder]", error); throw new Error("Could not confirm order"); }
    const { deliverPaidOrderEmail } = await import("@/lib/email/send.server");
    await deliverPaidOrderEmail(data.id);
    return { ok: true };
  });
