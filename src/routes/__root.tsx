import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Terminal } from "lucide-react";

import { ShopProvider } from "@/lib/shop-store";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

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

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sharma Store" },
      { name: "description", content: "Shop Smarter is a grocery shop management app for tracking inventory, sales, and profits." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Sharma Store" },
      { property: "og:description", content: "Shop Smarter is a grocery shop management app for tracking inventory, sales, and profits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Sharma Store" },
      { name: "twitter:description", content: "Shop Smarter is a grocery shop management app for tracking inventory, sales, and profits." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/p6Yw4hk81UPyt9Tg3J4WEb9211N2/social-images/social-1776572929817-sharma_store.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/p6Yw4hk81UPyt9Tg3J4WEb9211N2/social-images/social-1776572929817-sharma_store.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
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

function RootComponent() {
  return (
    <ShopProvider>
      <div className="min-h-screen scanlines">
        <header className="border-b border-border bg-card/40 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-primary/60 bg-primary/10 shadow-[var(--glow-primary)]">
                <Terminal className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-foreground">
                  GROCER<span className="text-primary">//</span>OS
                </h1>
                <p className="label-mono text-muted-foreground">v0.2 // shop console</p>
              </div>
            </Link>
            <nav className="flex flex-wrap items-center gap-1 font-mono text-xs uppercase tracking-widest">
              <NavLink to="/">dashboard</NavLink>
              <NavLink to="/products">products</NavLink>
              <NavLink to="/purchases">purchases</NavLink>
              <NavLink to="/sales">sales</NavLink>
              <NavLink to="/reports">reports</NavLink>
              <Link
                to="/shop"
                className="ml-2 rounded-sm border border-accent/60 bg-accent/10 px-3 py-1.5 text-accent transition-colors hover:bg-accent/20"
              >
                shop_app →
              </Link>
            </nav>
          </div>
        </header>
        <Outlet />
        <Toaster />
      </div>
    </ShopProvider>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      activeProps={{ className: "border-primary/60 bg-primary/10 text-primary shadow-[var(--glow-primary)]" }}
      className="rounded-sm border border-transparent px-3 py-1.5 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
    >
      {children}
    </Link>
  );
}
