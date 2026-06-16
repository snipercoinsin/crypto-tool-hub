// Site customization: public read + admin write.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicSiteSettings = {
  siteName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  telegramAccountHandle: string;
  telegramAccountUrl: string;
  telegramGroupHandle: string;
  telegramGroupUrl: string;
  adsText: string;
  adsUrl: string;
  themeBackground: string;
  themePrimary: string;
  themeAccent: string;
  themeCard: string;
  bgImageUrl: string | null;
  bgPlacement: "none" | "full" | "top" | "bottom";
};

const DEFAULTS: PublicSiteSettings = {
  siteName: "Hikaso",
  logoUrl: null,
  faviconUrl: null,
  telegramAccountHandle: "@Hikas0",
  telegramAccountUrl: "https://t.me/Hikas0",
  telegramGroupHandle: "@free_Tools_Hacking",
  telegramGroupUrl: "https://t.me/free_Tools_Hacking",
  adsText: "",
  adsUrl: "",
  themeBackground: "",
  themePrimary: "",
  themeAccent: "",
  themeCard: "",
  bgImageUrl: null,
  bgPlacement: "none",
};

async function signedSite(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage
    .from("site-assets")
    .createSignedUrl(path, 60 * 60 * 24); // 24h
  return data?.signedUrl ?? null;
}

async function readAllSettings(): Promise<Record<string, string>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("settings").select("key,value");
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
}

export const getPublicSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicSiteSettings> => {
    try {
      const m = await readAllSettings();
      const handleAccount = (m.telegram_account_handle || DEFAULTS.telegramAccountHandle).trim();
      const handleGroup = (m.telegram_group_handle || DEFAULTS.telegramGroupHandle).trim();
      const accountUrl =
        m.telegram_account_url?.trim() ||
        `https://t.me/${handleAccount.replace(/^@/, "")}`;
      const groupUrl =
        m.telegram_group_url?.trim() ||
        `https://t.me/${handleGroup.replace(/^@/, "")}`;
      return {
        siteName: m.site_name?.trim() || DEFAULTS.siteName,
        logoUrl: await signedSite(m.logo_path),
        faviconUrl: await signedSite(m.favicon_path),
        telegramAccountHandle: handleAccount,
        telegramAccountUrl: accountUrl,
        telegramGroupHandle: handleGroup,
        telegramGroupUrl: groupUrl,
        adsText: m.ads_text ?? "",
        adsUrl: m.ads_url ?? "",
        themeBackground: m.theme_background ?? "",
        themePrimary: m.theme_primary ?? "",
        themeAccent: m.theme_accent ?? "",
        themeCard: m.theme_card ?? "",
        bgImageUrl: await signedSite(m.bg_image_path),
        bgPlacement: ((m.bg_placement as PublicSiteSettings["bgPlacement"]) || "none"),
      };
    } catch (e) {
      console.error("[getPublicSiteSettings]", e);
      return DEFAULTS;
    }
  },
);

export const adminGetCustomization = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("@/lib/admin.server");
  await requireAdmin();
  const m = await readAllSettings();
  return {
    site_name: m.site_name ?? "",
    logo_path: m.logo_path ?? "",
    favicon_path: m.favicon_path ?? "",
    telegram_account_handle: m.telegram_account_handle ?? "",
    telegram_account_url: m.telegram_account_url ?? "",
    telegram_group_handle: m.telegram_group_handle ?? "",
    telegram_group_url: m.telegram_group_url ?? "",
    ads_text: m.ads_text ?? "",
    ads_url: m.ads_url ?? "",
    theme_background: m.theme_background ?? "",
    theme_primary: m.theme_primary ?? "",
    theme_accent: m.theme_accent ?? "",
    theme_card: m.theme_card ?? "",
    bg_image_path: m.bg_image_path ?? "",
    bg_placement: m.bg_placement ?? "none",
    logo_url: await signedSite(m.logo_path),
    favicon_url: await signedSite(m.favicon_path),
    bg_image_url: await signedSite(m.bg_image_path),
  };
});

const saveSchema = z.object({
  site_name: z.string().max(100),
  logo_path: z.string().max(300).optional().default(""),
  favicon_path: z.string().max(300).optional().default(""),
  telegram_account_handle: z.string().max(100),
  telegram_account_url: z.string().max(300).optional().default(""),
  telegram_group_handle: z.string().max(100),
  telegram_group_url: z.string().max(300).optional().default(""),
  ads_text: z.string().max(500).optional().default(""),
  ads_url: z.string().max(500).optional().default(""),
  theme_background: z.string().max(100).optional().default(""),
  theme_primary: z.string().max(100).optional().default(""),
  theme_accent: z.string().max(100).optional().default(""),
  theme_card: z.string().max(100).optional().default(""),
  bg_image_path: z.string().max(300).optional().default(""),
  bg_placement: z.enum(["none", "full", "top", "bottom"]).default("none"),
});

export const adminSaveCustomization = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = Object.entries(data).map(([key, value]) => ({
      key,
      value: String(value ?? ""),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabaseAdmin.from("settings").upsert(rows, { onConflict: "key" });
    if (error) {
      console.error("[adminSaveCustomization]", error);
      throw new Error("Could not save customization");
    }
    return { ok: true };
  });

// Signed upload URL for branding assets (logo / favicon / background)
export const adminGetSiteAssetUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      kind: z.enum(["logo", "favicon", "background"]),
      filename: z.string().min(1).max(200),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.kind}/${crypto.randomUUID()}-${safe}`;
    const { data: s, error } = await supabaseAdmin.storage
      .from("site-assets")
      .createSignedUploadUrl(path);
    if (error || !s) {
      console.error("[site-asset upload url]", error);
      throw new Error("Upload URL failed");
    }
    return { path, token: s.token };
  });
