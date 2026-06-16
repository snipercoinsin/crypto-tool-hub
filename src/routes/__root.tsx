import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { getPublicSiteSettings, type PublicSiteSettings } from "@/lib/api/customization.functions";

const FALLBACK_FAVICON =
  "/__l5e/assets-v1/e774d959-3bf3-4fa2-846d-ff9781cde364/hikaso-logo.jpg";

export const siteSettingsQuery = queryOptions({
  queryKey: ["siteSettings"],
  queryFn: () => getPublicSiteSettings(),
  staleTime: 60_000,
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteSettingsQuery),
  head: ({ loaderData }) => {
    const s = loaderData as PublicSiteSettings | undefined;
    const favicon = s?.faviconUrl || FALLBACK_FAVICON;
    const name = s?.siteName || "Hikaso";
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: `${name} — Premium Tools` },
        { name: "description", content: `${name}. Pay with Bitcoin or Monero.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: favicon },
        { rel: "apple-touch-icon", href: favicon },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;600&display=swap",
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function ThemeOverride({ s }: { s: PublicSiteSettings | undefined }) {
  if (!s) return null;
  const overrides: string[] = [];
  if (s.themeBackground) overrides.push(`--background: ${s.themeBackground};`);
  if (s.themePrimary) overrides.push(`--primary: ${s.themePrimary};`);
  if (s.themeAccent) overrides.push(`--accent: ${s.themeAccent};`);
  if (s.themeCard) overrides.push(`--card: ${s.themeCard};`);
  if (overrides.length === 0) return null;
  return <style>{`:root{${overrides.join("")}}`}</style>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const data = Route.useLoaderData() as PublicSiteSettings | undefined;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeOverride s={data} />
      <Outlet />
      <Toaster theme="dark" position="top-center" richColors />
    </QueryClientProvider>
  );
}
