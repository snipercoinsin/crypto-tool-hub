import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listTools } from "@/lib/api/storefront.functions";
import { ToolCard } from "@/components/ToolCard";

const toolsQuery = queryOptions({
  queryKey: ["tools"],
  queryFn: () => listTools(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hikaso — Premium Tools, Paid in Crypto" },
      {
        name: "description",
        content:
          "Browse premium tools and pay instantly with Bitcoin or Monero. Direct delivery, no middlemen.",
      },
      { property: "og:title", content: "Hikaso — Premium Tools, Paid in Crypto" },
      { property: "og:description", content: "Premium tools. Pay with BTC or XMR. Instant delivery." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(toolsQuery),
  component: Storefront,
});

function Storefront() {
  const { data: tools } = useSuspenseQuery(toolsQuery);

  return (
    <div className="hero-bg min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[color:var(--primary)]" />
            <span className="text-lg font-semibold tracking-tight">Hikaso</span>
          </div>
          <nav className="text-sm text-muted-foreground">
            <a href="#tools" className="hover:text-foreground">Catalog</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-12 text-center">
        <p className="mb-4 inline-block rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
          Crypto-native marketplace
        </p>
        <h1 className="text-balance text-5xl font-semibold md:text-6xl">
          Premium tools, <span className="gold-text">paid in crypto.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground">
          Pick a tool. Pay with Bitcoin or Monero. Get an instant download — no
          accounts, no middlemen.
        </p>
      </section>

      <section id="tools" className="mx-auto max-w-6xl px-6 pb-24">
        {tools.length === 0 ? (
          <div className="card-elev rounded-2xl p-16 text-center text-muted-foreground">
            No tools available yet. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <ToolCard key={t.id} tool={t} />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © Hikaso · Payments settle on-chain
      </footer>
    </div>
  );
}
