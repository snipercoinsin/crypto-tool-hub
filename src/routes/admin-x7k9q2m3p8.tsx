import { createFileRoute, useNavigate, Outlet } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { adminLogin, adminMe } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/admin-x7k9q2m3p8")({
  head: () => ({ meta: [{ title: "Restricted" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminGate,
});

function AdminGate() {
  const me = useServerFn(adminMe);
  const login = useServerFn(adminLogin);
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    me()
      .then((r) => {
        setAuthed(!!r.isAdmin);
        if (r.isAdmin) navigate({ to: "/admin-x7k9q2m3p8/dashboard" });
      })
      .finally(() => setReady(true));
  }, [me, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login({ data: { password: pw } });
      navigate({ to: "/admin-x7k9q2m3p8/dashboard" });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (authed) return <Outlet />;

  return (
    <div className="hero-bg flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="card-elev w-full max-w-sm rounded-2xl p-8">
        <h1 className="text-xl font-semibold">Restricted access</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the admin password to continue.</p>
        <input
          type="password"
          required
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          className="mt-6 w-full rounded-xl border border-border bg-[color:var(--input)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
        />
        {err && <p className="mt-3 text-sm text-[color:var(--destructive)]">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-xl bg-[color:var(--primary)] px-4 py-3 font-semibold text-[color:var(--primary-foreground)] disabled:opacity-60"
        >
          {busy ? "Verifying…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
