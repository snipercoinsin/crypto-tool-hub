import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { User, Users, Megaphone } from "lucide-react";
import { listTools } from "@/lib/api/storefront.functions";
import { ToolCard } from "@/components/ToolCard";
import { siteSettingsQuery } from "@/routes/__root";
import hikasoLogo from "@/assets/hikaso-logo.jpg.asset.json";

const toolsQuery = queryOptions({
  queryKey: ["tools"],
  queryFn: () => listTools(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(toolsQuery),
  component: Storefront,
});

function Storefront() {
  const { data: tools } = useSuspenseQuery(toolsQuery);
  const { data: site } = useSuspenseQuery(siteSettingsQuery);

  const logoSrc = site.logoUrl || hikasoLogo.url;
  const showFullBg = site.bgPlacement === "full" && site.bgImageUrl;
  const showTopBg = site.bgPlacement === "top" && site.bgImageUrl;
  const showBottomBg = site.bgPlacement === "bottom" && site.bgImageUrl;

  return (
    <div
      className="hero-bg min-h-screen relative"
      style={
        showFullBg
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.75)), url(${site.bgImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >
      {showTopBg && (
        <div
          className="absolute inset-x-0 top-0 h-[50vh] -z-0"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.4), var(--background)), url(${site.bgImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      {showBottomBg && (
        <div
          className="absolute inset-x-0 bottom-0 h-[50vh] -z-0"
          style={{
            backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.4), var(--background)), url(${site.bgImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      <div className="relative z-10">
        <header className="border-b border-border/60">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <img
                src={logoSrc}
                alt={site.siteName}
                className="h-10 w-10 rounded-lg object-cover ring-1 ring-border"
              />
              <span className="text-lg font-semibold tracking-tight">{site.siteName}</span>
            </div>
            <nav className="flex items-center gap-2 text-sm">
              <a
                href={site.telegramAccountUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Telegram account"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <User className="h-4 w-4" />
                {site.telegramAccountHandle}
              </a>
              <a
                href={site.telegramGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Telegram group"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <Users className="h-4 w-4" />
                {site.telegramGroupHandle}
              </a>
            </nav>
          </div>
        </header>

        {site.adsText && (
          <div className="border-b border-border/60 bg-[color:var(--primary)]/10">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-2.5 text-sm">
              <Megaphone className="h-4 w-4 text-[color:var(--primary)]" />
              {site.adsUrl ? (
                <a
                  href={site.adsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {site.adsText}
                </a>
              ) : (
                <span>{site.adsText}</span>
              )}
            </div>
          </div>
        )}

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
          © {site.siteName} · Payments settle on-chain
        </footer>
      </div>
    </div>
  );
}
