import { useState } from "react";
import type { ToolCard as Tool } from "@/lib/api/storefront.functions";
import { PaymentModal } from "./PaymentModal";

function ytEmbed(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export function ToolCard({ tool }: { tool: Tool }) {
  const [open, setOpen] = useState(false);
  const embed = ytEmbed(tool.youtube_url);

  return (
    <>
      <article className="card-elev group flex flex-col overflow-hidden rounded-2xl transition-transform duration-300 hover:-translate-y-1">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {embed ? (
            <iframe
              src={embed}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={tool.name}
            />
          ) : tool.video_url ? (
            <video
              src={tool.video_url}
              poster={tool.image_url ?? undefined}
              controls
              className="h-full w-full object-cover"
            />
          ) : tool.image_url ? (
            <img
              src={tool.image_url}
              alt={tool.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              No preview
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-6">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-semibold">{tool.name}</h3>
            <span className="shrink-0 rounded-full border border-border bg-secondary px-3 py-1 text-sm font-mono">
              ${tool.price_usd.toFixed(2)}
            </span>
          </div>
          <p className="line-clamp-4 text-sm text-muted-foreground whitespace-pre-wrap">
            {tool.description || "—"}
          </p>

          <button
            onClick={() => setOpen(true)}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--btc)] px-4 py-3 font-semibold text-[color:var(--primary-foreground)] shadow-[var(--shadow-card)] transition hover:brightness-110 active:scale-[0.98]"
          >
            <BitcoinLogo className="h-5 w-5" />
            Pay with Bitcoin
          </button>
        </div>
      </article>

      <PaymentModal open={open} onClose={() => setOpen(false)} tool={tool} />
    </>
  );
}

function BitcoinLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#0b0b0b" opacity="0.18" />
      <path
        fill="currentColor"
        d="M43.9 28.6c.6-3.9-2.4-6-6.4-7.4l1.3-5.2-3.2-.8-1.2 5c-.8-.2-1.7-.4-2.5-.6l1.3-5.1-3.2-.8-1.3 5.2c-.7-.2-1.4-.3-2-.5l0-.0-4.4-1.1-.8 3.4s2.4.5 2.3.6c1.3.3 1.5 1.2 1.5 1.9l-3.7 14.8c-.2.4-.5 1-1.5.7.1.1-2.3-.6-2.3-.6l-1.6 3.7 4.2 1c.8.2 1.5.4 2.3.6l-1.3 5.3 3.2.8 1.3-5.2c.9.2 1.7.5 2.5.7l-1.3 5.2 3.2.8 1.3-5.3c5.4 1 9.4.6 11.1-4.3 1.4-3.9-.1-6.2-2.9-7.6 2.1-.5 3.6-1.8 4-4.6zm-7.2 10c-1 3.9-7.6 1.8-9.7 1.3l1.7-6.9c2.1.5 9 1.5 8 5.6zm1-10c-.9 3.6-6.4 1.8-8.1 1.3l1.5-6.3c1.7.4 7.5 1.2 6.6 5z"
      />
    </svg>
  );
}
