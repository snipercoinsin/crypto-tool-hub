import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { getDownloadUrl } from "@/lib/api/orders.functions";

export const Route = createFileRoute("/download/$orderId")({
  head: () => ({ meta: [{ title: "Download your tool" }] }),
  validateSearch: (s: Record<string, unknown>) => z.object({ t: z.string() }).parse(s),
  component: DownloadPage,
});

function DownloadPage() {
  const { orderId } = Route.useParams();
  const { t } = Route.useSearch();
  const getUrl = useServerFn(getDownloadUrl);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filename, setFilename] = useState("download.zip");

  useEffect(() => {
    getUrl({ data: { orderId, token: t } })
      .then((r) => {
        setUrl(r.url);
        setFilename(r.filename);
      })
      .catch((e: Error) => setErr(e.message));
  }, [getUrl, orderId, t]);

  return (
    <div className="hero-bg min-h-screen">
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="card-elev rounded-2xl p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--success)]/15 text-[color:var(--success)]">
            ✓
          </div>
          <h1 className="text-3xl font-semibold">Payment confirmed</h1>
          <p className="mt-2 text-muted-foreground">
            Your download is ready. The link below is private to this order.
          </p>

          {err && (
            <p className="mt-4 rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 p-3 text-sm">
              {err}
            </p>
          )}

          {url ? (
            <a
              href={url}
              download={filename}
              className="mt-8 inline-block rounded-xl bg-[color:var(--primary)] px-6 py-3 font-semibold text-[color:var(--primary-foreground)]"
            >
              Download {filename}
            </a>
          ) : !err ? (
            <div className="mt-8 text-muted-foreground">Preparing your file…</div>
          ) : null}

          <div className="mt-8">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to catalog
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
