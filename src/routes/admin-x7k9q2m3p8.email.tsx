import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminMe } from "@/lib/api/admin.functions";
import {
  adminGetEmailSettings,
  adminSaveEmailSettings,
  adminTestEmail,
} from "@/lib/api/email-settings.functions";
import { AdminNav } from "@/components/AdminNav";

export const Route = createFileRoute("/admin-x7k9q2m3p8/email")({
  head: () => ({ meta: [{ title: "Email" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: EmailPage,
});

function EmailPage() {
  const me = useServerFn(adminMe);
  const navigate = useNavigate();
  const meQ = useQuery({ queryKey: ["adminMe"], queryFn: () => me() });

  const get = useServerFn(adminGetEmailSettings);
  const save = useServerFn(adminSaveEmailSettings);
  const test = useServerFn(adminTestEmail);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["adminEmail"], queryFn: () => get(), enabled: !!meQ.data?.isAdmin });

  const [f, setF] = useState({
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_pass: "",
    smtp_secure: "starttls" as "ssl" | "tls" | "starttls" | "none",
    smtp_from_name: "",
    smtp_from_email: "",
    email_auto_send: false,
    email_subject: "",
    email_body: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    if (q.data && !loaded) {
      setF({ ...q.data });
      setLoaded(true);
    }
  }, [q.data, loaded]);

  const m = useMutation({
    mutationFn: () => save({ data: f }),
    onSuccess: () => {
      toast.success("Email settings saved");
      qc.invalidateQueries({ queryKey: ["adminEmail"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tm = useMutation({
    mutationFn: () => test({ data: { to: testTo } }),
    onSuccess: () => toast.success("Test email sent"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (meQ.isLoading) return null;
  if (!meQ.data?.isAdmin) {
    navigate({ to: "/admin-x7k9q2m3p8" });
    return null;
  }

  function up<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  return (
    <div className="hero-bg min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <section className="card-elev rounded-2xl p-6">
          <h2 className="text-lg font-semibold">SMTP server</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Used to automatically email buyers their download link after payment is confirmed.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <T label="Host" value={f.smtp_host} onChange={(v) => up("smtp_host", v)} placeholder="smtp.gmail.com" />
            <T label="Port" value={f.smtp_port} onChange={(v) => up("smtp_port", v)} placeholder="587" />
            <T label="Username (email)" value={f.smtp_user} onChange={(v) => up("smtp_user", v)} />
            <T label="Password" value={f.smtp_pass} onChange={(v) => up("smtp_pass", v)} type="password" />
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Encryption</span>
              <select
                value={f.smtp_secure}
                onChange={(e) => up("smtp_secure", e.target.value as typeof f.smtp_secure)}
                className="w-full rounded-xl border border-border bg-[color:var(--input)] px-3 py-2.5"
              >
                <option value="starttls">STARTTLS (port 587)</option>
                <option value="ssl">SSL (port 465)</option>
                <option value="tls">TLS</option>
                <option value="none">None (insecure)</option>
              </select>
            </label>
            <T label="From name" value={f.smtp_from_name} onChange={(v) => up("smtp_from_name", v)} placeholder="Hikaso" />
            <T label="From email" value={f.smtp_from_email} onChange={(v) => up("smtp_from_email", v)} placeholder="noreply@yourdomain.com" />
          </div>
        </section>

        <section className="card-elev rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Automatic delivery</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            When enabled, buyers receive their secure download link by email as soon as payment is confirmed.
            Placeholders: <code>{"{tool_name}"}</code>, <code>{"{download_url}"}</code>, <code>{"{site_name}"}</code>, <code>{"{email}"}</code>.
          </p>
          <label className="mt-4 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={f.email_auto_send}
              onChange={(e) => up("email_auto_send", e.target.checked)}
              className="h-4 w-4 accent-[color:var(--primary)]"
            />
            Send download email automatically on payment confirmation
          </label>
          <div className="mt-4 grid gap-4">
            <T label="Subject" value={f.email_subject} onChange={(v) => up("email_subject", v)} />
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Body (HTML)</span>
              <textarea
                rows={10}
                value={f.email_body}
                onChange={(e) => up("email_body", e.target.value)}
                className="w-full rounded-xl border border-border bg-[color:var(--input)] px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              />
            </label>
          </div>
        </section>

        <section className="card-elev rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Test send</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Save first, then send a test to verify your SMTP credentials.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              type="email"
              placeholder="you@example.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              className="flex-1 min-w-[240px] rounded-xl border border-border bg-[color:var(--input)] px-3 py-2.5"
            />
            <button
              onClick={() => tm.mutate()}
              disabled={tm.isPending || !testTo}
              className="rounded-xl border border-border px-4 py-2.5 hover:bg-accent disabled:opacity-60"
            >
              {tm.isPending ? "Sending…" : "Send test email"}
            </button>
          </div>
        </section>

        <div>
          <button
            onClick={() => m.mutate()}
            disabled={m.isPending}
            className="rounded-xl bg-[color:var(--primary)] px-5 py-2.5 font-semibold text-[color:var(--primary-foreground)] disabled:opacity-60"
          >
            {m.isPending ? "Saving…" : "Save email settings"}
          </button>
        </div>
      </main>
    </div>
  );
}

function T({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-[color:var(--input)] px-3 py-2.5 outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
      />
    </label>
  );
}
