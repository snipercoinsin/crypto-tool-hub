import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminMe } from "@/lib/api/admin.functions";
import {
  adminGetCustomization,
  adminSaveCustomization,
  adminGetSiteAssetUploadUrl,
} from "@/lib/api/customization.functions";
import { AdminNav } from "@/components/AdminNav";

export const Route = createFileRoute("/admin-x7k9q2m3p8/customization")({
  head: () => ({ meta: [{ title: "Customization" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: CustomizationPage,
});

function CustomizationPage() {
  const me = useServerFn(adminMe);
  const navigate = useNavigate();
  const meQ = useQuery({ queryKey: ["adminMe"], queryFn: () => me() });

  const get = useServerFn(adminGetCustomization);
  const save = useServerFn(adminSaveCustomization);
  const getUploadUrl = useServerFn(adminGetSiteAssetUploadUrl);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["adminCustomization"], queryFn: () => get(), enabled: !!meQ.data?.isAdmin });

  const [form, setForm] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (q.data && !loaded) {
      setForm({
        site_name: q.data.site_name || "Hikaso",
        logo_path: q.data.logo_path,
        favicon_path: q.data.favicon_path,
        telegram_account_handle: q.data.telegram_account_handle || "@Hikas0",
        telegram_account_url: q.data.telegram_account_url,
        telegram_group_handle: q.data.telegram_group_handle || "@free_Tools_Hacking",
        telegram_group_url: q.data.telegram_group_url,
        ads_text: q.data.ads_text,
        ads_url: q.data.ads_url,
        theme_background: q.data.theme_background,
        theme_primary: q.data.theme_primary,
        theme_accent: q.data.theme_accent,
        theme_card: q.data.theme_card,
        bg_image_path: q.data.bg_image_path,
        bg_placement: q.data.bg_placement || "none",
      });
      setLoaded(true);
    }
  }, [q.data, loaded]);

  const m = useMutation({
    mutationFn: () =>
      save({
        data: {
          site_name: form.site_name || "Hikaso",
          logo_path: form.logo_path || "",
          favicon_path: form.favicon_path || "",
          telegram_account_handle: form.telegram_account_handle || "@Hikas0",
          telegram_account_url: form.telegram_account_url || "",
          telegram_group_handle: form.telegram_group_handle || "@free_Tools_Hacking",
          telegram_group_url: form.telegram_group_url || "",
          ads_text: form.ads_text || "",
          ads_url: form.ads_url || "",
          theme_background: form.theme_background || "",
          theme_primary: form.theme_primary || "",
          theme_accent: form.theme_accent || "",
          theme_card: form.theme_card || "",
          bg_image_path: form.bg_image_path || "",
          bg_placement: (form.bg_placement as "none" | "full" | "top" | "bottom") || "none",
        },
      }),
    onSuccess: () => {
      toast.success("Customization saved");
      qc.invalidateQueries({ queryKey: ["adminCustomization"] });
      qc.invalidateQueries({ queryKey: ["siteSettings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadKind(kind: "logo" | "favicon" | "background", file: File) {
    try {
      const { path, token } = await getUploadUrl({ data: { kind, filename: file.name } });
      const { error } = await supabase.storage.from("site-assets").uploadToSignedUrl(path, token, file);
      if (error) throw new Error(error.message);
      const fieldKey = kind === "logo" ? "logo_path" : kind === "favicon" ? "favicon_path" : "bg_image_path";
      setForm((f) => ({ ...f, [fieldKey]: path }));
      toast.success(`${kind} uploaded — remember to Save`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (meQ.isLoading) return null;
  if (!meQ.data?.isAdmin) {
    navigate({ to: "/admin-x7k9q2m3p8" });
    return null;
  }

  function setF(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="hero-bg min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <section className="card-elev rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Branding</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <TextF label="Site name" value={form.site_name ?? ""} onChange={(v) => setF("site_name", v)} />
            <ImgF
              label="Logo"
              previewUrl={q.data?.logo_url ?? null}
              onUpload={(f) => uploadKind("logo", f)}
            />
            <ImgF
              label="Favicon"
              previewUrl={q.data?.favicon_url ?? null}
              onUpload={(f) => uploadKind("favicon", f)}
            />
          </div>
        </section>

        <section className="card-elev rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Telegram</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <TextF label="Account handle" value={form.telegram_account_handle ?? ""} onChange={(v) => setF("telegram_account_handle", v)} placeholder="@Hikas0" />
            <TextF label="Account URL (optional)" value={form.telegram_account_url ?? ""} onChange={(v) => setF("telegram_account_url", v)} placeholder="https://t.me/Hikas0" />
            <TextF label="Group handle" value={form.telegram_group_handle ?? ""} onChange={(v) => setF("telegram_group_handle", v)} placeholder="@free_Tools_Hacking" />
            <TextF label="Group URL (optional)" value={form.telegram_group_url ?? ""} onChange={(v) => setF("telegram_group_url", v)} placeholder="https://t.me/free_Tools_Hacking" />
          </div>
        </section>

        <section className="card-elev rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Promo banner (ads)</h2>
          <p className="mt-1 text-sm text-muted-foreground">Shown as a strip below the header. Leave text empty to hide.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <TextF label="Banner text" value={form.ads_text ?? ""} onChange={(v) => setF("ads_text", v)} />
            <TextF label="Banner link URL (optional)" value={form.ads_url ?? ""} onChange={(v) => setF("ads_url", v)} />
          </div>
        </section>

        <section className="card-elev rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Theme colors</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use any CSS color (e.g. <code>#0b0f1a</code>, <code>oklch(0.2 0.02 260)</code>). Leave blank for default.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <TextF mono label="Background" value={form.theme_background ?? ""} onChange={(v) => setF("theme_background", v)} placeholder="#0b0f1a" />
            <TextF mono label="Primary (buttons / accents)" value={form.theme_primary ?? ""} onChange={(v) => setF("theme_primary", v)} placeholder="#f5b400" />
            <TextF mono label="Accent" value={form.theme_accent ?? ""} onChange={(v) => setF("theme_accent", v)} />
            <TextF mono label="Card surface" value={form.theme_card ?? ""} onChange={(v) => setF("theme_card", v)} />
          </div>
        </section>

        <section className="card-elev rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Background image</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ImgF
              label="Image"
              previewUrl={q.data?.bg_image_url ?? null}
              onUpload={(f) => uploadKind("background", f)}
            />
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Placement</span>
              <select
                value={form.bg_placement ?? "none"}
                onChange={(e) => setF("bg_placement", e.target.value)}
                className="w-full rounded-xl border border-border bg-[color:var(--input)] px-3 py-2.5"
              >
                <option value="none">None</option>
                <option value="full">Full page</option>
                <option value="top">Top half</option>
                <option value="bottom">Bottom half</option>
              </select>
            </label>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            onClick={() => m.mutate()}
            disabled={m.isPending}
            className="rounded-xl bg-[color:var(--primary)] px-5 py-2.5 font-semibold text-[color:var(--primary-foreground)] disabled:opacity-60"
          >
            {m.isPending ? "Saving…" : "Save customization"}
          </button>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            View storefront →
          </Link>
        </div>
      </main>
    </div>
  );
}

function TextF({
  label, value, onChange, placeholder, mono,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border border-border bg-[color:var(--input)] px-3 py-2.5 outline-none focus:ring-2 focus:ring-[color:var(--ring)] ${mono ? "font-mono text-sm" : ""}`}
      />
    </label>
  );
}

function ImgF({
  label, previewUrl, onUpload,
}: {
  label: string; previewUrl: string | null; onUpload: (f: File) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-12 w-12 rounded-lg border border-border object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-lg border border-dashed border-border" />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
          className="w-full rounded-xl border border-border bg-[color:var(--input)] px-3 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--primary)] file:px-3 file:py-1 file:text-[color:var(--primary-foreground)]"
        />
      </div>
    </label>
  );
}
