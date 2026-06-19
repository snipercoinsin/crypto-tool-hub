import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  adminMe,
  adminListTools,
  adminListOrders,
  adminGetSettings,
  adminSaveSettings,
  adminGetUploadUrls,
  adminCreateTool,
  adminDeleteTool,
  adminConfirmOrder,
  adminDeleteOrder,
  adminListCategories,
  adminCreateCategory,
  adminDeleteCategory,
} from "@/lib/api/admin.functions";

import { AdminNav } from "@/components/AdminNav";


export const Route = createFileRoute("/admin-x7k9q2m3p8/dashboard")({
  head: () => ({ meta: [{ title: "Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Dashboard,
});

function Dashboard() {
  const me = useServerFn(adminMe);
  const navigate = useNavigate();

  const meQ = useQuery({ queryKey: ["adminMe"], queryFn: () => me() });

  if (meQ.isLoading) return null;
  if (!meQ.data?.isAdmin) {
    navigate({ to: "/admin-x7k9q2m3p8" });
    return null;
  }

  return (
    <div className="hero-bg min-h-screen">
      <AdminNav />

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <SettingsCard />
        <CategoriesCard />
        <NewToolCard />
        <ToolsCard />
        <OrdersCard />
      </main>
    </div>
  );
}

function CategoriesCard() {
  const list = useServerFn(adminListCategories);
  const create = useServerFn(adminCreateCategory);
  const del = useServerFn(adminDeleteCategory);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["adminCategories"], queryFn: () => list() });
  const [name, setName] = useState("");
  const [order, setOrder] = useState("0");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["adminCategories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["tools"] });
  };

  const addM = useMutation({
    mutationFn: () => create({ data: { name, sort_order: Number(order) || 0 } }),
    onSuccess: () => {
      toast.success("Category added");
      setName("");
      setOrder("0");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Category deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="card-elev rounded-2xl p-6">
      <h2 className="text-lg font-semibold">Categories</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Group tools so buyers can filter by category on the storefront.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addM.mutate();
        }}
        className="mt-4 flex flex-wrap items-end gap-3"
      >
        <Field label="Name" value={name} onChange={setName} className="flex-1 min-w-[200px]" />
        <Field label="Sort order" value={order} onChange={setOrder} type="number" className="w-32" />
        <button
          type="submit"
          disabled={addM.isPending}
          className="rounded-xl bg-[color:var(--primary)] px-4 py-2.5 font-semibold text-[color:var(--primary-foreground)] disabled:opacity-60"
        >
          {addM.isPending ? "Adding…" : "Add category"}
        </button>
      </form>

      <div className="mt-6 divide-y divide-border">
        {(q.data ?? []).map((c) => (
          <div key={c.id} className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">Sort: {c.sort_order}</div>
            </div>
            <button
              onClick={() => confirm(`Delete category "${c.name}"? Tools in it will become uncategorized.`) && delM.mutate(c.id)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-[color:var(--destructive)] hover:bg-accent"
            >
              Delete
            </button>
          </div>
        ))}
        {q.data?.length === 0 && <p className="text-sm text-muted-foreground">No categories yet.</p>}
      </div>
    </section>
  );
}


function SettingsCard() {
  const get = useServerFn(adminGetSettings);
  const save = useServerFn(adminSaveSettings);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings"], queryFn: () => get() });
  const [btc, setBtc] = useState("");
  const [xmr, setXmr] = useState("");
  const [touched, setTouched] = useState(false);

  if (!touched && q.data) {
    setBtc(q.data.btc_address);
    setXmr(q.data.xmr_address);
    setTouched(true);
  }

  const m = useMutation({
    mutationFn: () => save({ data: { btc_address: btc, xmr_address: xmr } }),
    onSuccess: () => {
      toast.success("Addresses saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="card-elev rounded-2xl p-6">
      <h2 className="text-lg font-semibold">Receiving addresses</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Used as the deposit address for new orders.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="BTC address" value={btc} onChange={setBtc} mono />
        <Field label="XMR address" value={xmr} onChange={setXmr} mono />
      </div>
      <button
        onClick={() => m.mutate()}
        disabled={m.isPending}
        className="mt-4 rounded-xl bg-[color:var(--primary)] px-4 py-2 font-semibold text-[color:var(--primary-foreground)] disabled:opacity-60"
      >
        {m.isPending ? "Saving…" : "Save"}
      </button>
    </section>
  );
}

function NewToolCard() {
  const getUrls = useServerFn(adminGetUploadUrls);
  const createTool = useServerFn(adminCreateTool);
  const listCats = useServerFn(adminListCategories);
  const qc = useQueryClient();
  const catsQ = useQuery({ queryKey: ["adminCategories"], queryFn: () => listCats() });
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [yt, setYt] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [zip, setZip] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);


  async function uploadTo(bucket: string, path: string, token: string, file: File) {
    const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file);
    if (error) throw new Error(`${bucket}: ${error.message}`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!zip) {
      toast.error("Zip file is required");
      return;
    }
    setBusy(true);
    try {
      const urls = await getUrls({
        data: {
          imageName: image?.name,
          videoName: video?.name,
          zipName: zip.name,
        },
      });
      if (image && urls.image) await uploadTo("tool-images", urls.image.path, urls.image.token, image);
      if (video && urls.video) await uploadTo("tool-videos", urls.video.path, urls.video.token, video);
      await uploadTo("tool-zips", urls.zip.path, urls.zip.token, zip);

      await createTool({
        data: {
          name,
          description: desc,
          price_usd: Number(price),
          image_path: urls.image?.path ?? null,
          video_path: urls.video?.path ?? null,
          youtube_url: yt || null,
          zip_path: urls.zip.path,
          category_id: categoryId || null,
        },
      });
      toast.success("Tool added");
      setName(""); setDesc(""); setPrice(""); setYt(""); setCategoryId("");
      setImage(null); setVideo(null); setZip(null);
      qc.invalidateQueries({ queryKey: ["adminTools"] });
      qc.invalidateQueries({ queryKey: ["tools"] });
      (e.target as HTMLFormElement).reset();

    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-elev rounded-2xl p-6">
      <h2 className="text-lg font-semibold">Add a new tool</h2>
      <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Price (USD)" value={price} onChange={setPrice} type="number" step="0.01" />
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-border bg-[color:var(--input)] px-3 py-2.5 outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
          >
            <option value="">— Uncategorized —</option>
            {(catsQ.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <Field
          label="Description"
          value={desc}
          onChange={setDesc}
          textarea
          className="md:col-span-2"
        />
        <Field
          label="YouTube URL (optional)"
          value={yt}
          onChange={setYt}
          className="md:col-span-2"
        />

        <FileField label="Cover image" accept="image/*" onChange={setImage} />
        <FileField label="Video file (optional)" accept="video/*" onChange={setVideo} />
        <FileField label="Tool .zip (required)" accept=".zip,application/zip" onChange={setZip} required />
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[color:var(--primary)] px-5 py-2.5 font-semibold text-[color:var(--primary-foreground)] disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Publish tool"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ToolsCard() {
  const list = useServerFn(adminListTools);
  const del = useServerFn(adminDeleteTool);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["adminTools"], queryFn: () => list() });

  const m = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Tool deleted");
      qc.invalidateQueries({ queryKey: ["adminTools"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="card-elev rounded-2xl p-6">
      <h2 className="text-lg font-semibold">Tools</h2>
      <div className="mt-4 divide-y divide-border">
        {(q.data ?? []).map((t) => (
          <div key={t.id} className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-muted-foreground">${Number(t.price_usd).toFixed(2)}</div>
            </div>
            <button
              onClick={() => confirm("Delete this tool?") && m.mutate(t.id)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-[color:var(--destructive)] hover:bg-accent"
            >
              Delete
            </button>
          </div>
        ))}
        {q.data?.length === 0 && <p className="text-sm text-muted-foreground">No tools yet.</p>}
      </div>
    </section>
  );
}

function OrdersCard() {
  const list = useServerFn(adminListOrders);
  const confirmO = useServerFn(adminConfirmOrder);
  const delO = useServerFn(adminDeleteOrder);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["adminOrders"], queryFn: () => list(), refetchInterval: 15000 });
  const m = useMutation({
    mutationFn: (id: string) => confirmO({ data: { id } }),
    onSuccess: () => {
      toast.success("Marked paid");
      qc.invalidateQueries({ queryKey: ["adminOrders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const dm = useMutation({
    mutationFn: (id: string) => delO({ data: { id } }),
    onSuccess: () => {
      toast.success("Order deleted");
      qc.invalidateQueries({ queryKey: ["adminOrders"] });
      qc.invalidateQueries({ queryKey: ["adminEmails"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="card-elev rounded-2xl p-6">
      <h2 className="text-lg font-semibold">Orders</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        BTC orders auto-confirm once a matching deposit appears. XMR orders need manual confirmation.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2 pr-3">Tool</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Created</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(q.data ?? []).map((o) => {
              const tool = o.tools as { name: string } | null;
              return (
                <tr key={o.id}>
                  <td className="py-2 pr-3">{tool?.name ?? "—"}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{o.email}</td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {Number(o.crypto_amount)} {o.currency}
                  </td>
                  <td className="py-2 pr-3">
                    <StatusPill s={o.status as string} />
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {o.status === "pending" && (
                        <button
                          onClick={() => m.mutate(o.id)}
                          className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-accent"
                        >
                          Mark paid
                        </button>
                      )}
                      <button
                        onClick={() => confirm("Delete this order? This cannot be undone.") && dm.mutate(o.id)}
                        className="rounded-lg border border-border px-3 py-1 text-xs text-[color:var(--destructive)] hover:bg-accent"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {q.data?.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
      </div>
    </section>
  );
}


function StatusPill({ s }: { s: string }) {
  const cls =
    s === "paid"
      ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
      : s === "expired"
        ? "bg-[color:var(--destructive)]/15 text-[color:var(--destructive)]"
        : "bg-[color:var(--warning)]/15 text-[color:var(--warning)]";
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{s}</span>;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
  mono,
  textarea,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  mono?: boolean;
  textarea?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-[color:var(--input)] px-3 py-2.5 outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
        />
      ) : (
        <input
          type={type}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-border bg-[color:var(--input)] px-3 py-2.5 outline-none focus:ring-2 focus:ring-[color:var(--ring)] ${mono ? "font-mono text-sm" : ""}`}
        />
      )}
    </label>
  );
}

function FileField({
  label,
  accept,
  onChange,
  required,
}: {
  label: string;
  accept: string;
  onChange: (f: File | null) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="file"
        accept={accept}
        required={required}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="w-full rounded-xl border border-border bg-[color:var(--input)] px-3 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--primary)] file:px-3 file:py-1 file:text-[color:var(--primary-foreground)]"
      />
    </label>
  );
}
