import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { adminMe, adminListEmails } from "@/lib/api/admin.functions";
import { AdminNav } from "@/components/AdminNav";

export const Route = createFileRoute("/admin-x7k9q2m3p8/emails")({
  head: () => ({ meta: [{ title: "Admin · Emails" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: EmailsPage,
});

function flag(code?: string | null) {
  if (!code || code.length !== 2) return "";
  const cc = code.toUpperCase();
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function EmailsPage() {
  const me = useServerFn(adminMe);
  const list = useServerFn(adminListEmails);
  const navigate = useNavigate();
  const meQ = useQuery({ queryKey: ["adminMe"], queryFn: () => me() });
  const q = useQuery({ queryKey: ["adminEmails"], queryFn: () => list(), refetchInterval: 30000 });
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const data = q.data ?? [];
    if (!s) return data;
    return data.filter(
      (r) =>
        r.email?.toLowerCase().includes(s) ||
        r.ip_address?.toLowerCase().includes(s) ||
        r.country_code?.toLowerCase().includes(s),
    );
  }, [q.data, search]);

  if (meQ.isLoading) return null;
  if (!meQ.data?.isAdmin) {
    navigate({ to: "/admin-x7k9q2m3p8" });
    return null;
  }

  return (
    <div className="hero-bg min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <section className="card-elev rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Customer emails</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Every email address used to place an order, with the originating IP and country code.
              </p>
            </div>
            <input
              type="search"
              placeholder="Search email, IP, or country…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-xl border border-border bg-[color:var(--input)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            />
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">IP address</th>
                  <th className="py-2 pr-3">Country</th>
                  <th className="py-2 pr-3">Tool</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => {
                  const tool = r.tools as { name: string } | null;
                  return (
                    <tr key={i}>
                      <td className="py-2 pr-3 font-mono text-xs">{r.email}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{r.ip_address ?? "—"}</td>
                      <td className="py-2 pr-3 text-xs">
                        {r.country_code ? (
                          <span>
                            <span className="mr-1">{flag(r.country_code)}</span>
                            {r.country_code}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-3">{tool?.name ?? "—"}</td>
                      <td className="py-2 pr-3 text-xs">{r.status}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">No customer emails yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
