import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Box, ScanLine, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useShop, useTodayStats } from "@/lib/shop-store";
import { formatINR, formatNumberIN } from "@/lib/currency";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GROCER//OS — Hi-tech Shop Console" },
      {
        name: "description",
        content:
          "Terminal-grade grocery shop management: inventory, purchases, sales, P&L. Neon UI for fast operators.",
      },
      { property: "og:title", content: "GROCER//OS — Hi-tech Shop Console" },
      {
        property: "og:description",
        content:
          "Terminal-grade grocery shop management: inventory, purchases, sales, P&L.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { products, sales, purchases } = useShop();
  const { revenue, expenses, profit, lowStock, salesToday } = useTodayStats();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="corner-frame mb-8 rounded-sm border border-border bg-card/40 p-6">
        <p className="label-mono mb-2 text-primary">// dashboard</p>
        <h2 className="font-mono text-2xl font-bold uppercase tracking-wider text-foreground sm:text-4xl">
          shop<span className="text-primary">_</span>operations
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Track inventory, log purchases, record sales, and watch your margin in real time.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="neon" size="sm">
            <Link to="/sales">new sale <ArrowRight /></Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/purchases">log purchase</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/products">add product</Link>
          </Button>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="sales today" value={formatINR(revenue)} tone="primary" icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard label="expenses today" value={formatINR(expenses)} tone="accent" icon={<Box className="h-4 w-4" />} />
        <KpiCard
          label="profit today"
          value={formatINR(profit)}
          tone={profit >= 0 ? "neon" : "warning"}
          icon={<Activity className="h-4 w-4" />}
        />
        <KpiCard label="low stock" value={formatNumberIN(lowStock.length)} tone="warning" icon={<AlertTriangle className="h-4 w-4" />} />
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <Panel title="// low stock alerts" empty={lowStock.length === 0 ? "all stocked. systems nominal." : undefined}>
          <ul className="divide-y divide-border">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-mono text-foreground">{p.name}</p>
                  <p className="label-mono text-muted-foreground">{p.sku} · {p.category}</p>
                </div>
                <span className="font-mono text-warning">{formatNumberIN(p.stock)} left</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="// recent sales" empty={salesToday.length === 0 ? "no sales yet today." : undefined}>
          <ul className="divide-y divide-border">
            {salesToday.slice(0, 6).map((s) => {
              const product = products.find((p) => p.id === s.productId);
              return (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-mono text-foreground">{product?.name ?? "unknown"}</p>
                    <p className="label-mono text-muted-foreground">
                      {formatNumberIN(s.qty)} × {formatINR(s.unitPrice)} · {s.payment}
                    </p>
                  </div>
                  <span className="font-mono text-neon">{formatINR(s.total)}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </section>

      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <MiniStat label="total products" value={formatNumberIN(products.length)} />
        <MiniStat label="lifetime sales" value={formatNumberIN(sales.length)} />
        <MiniStat label="lifetime purchases" value={formatNumberIN(purchases.length)} />
      </section>

      <footer className="mt-10 flex items-center justify-between border-t border-border pt-4">
        <p className="label-mono text-muted-foreground">
          <ScanLine className="mr-1 inline h-3 w-3" /> local-first storage active
        </p>
        <p className="label-mono text-muted-foreground">© grocer//os</p>
      </footer>
    </main>
  );
}

type Tone = "primary" | "accent" | "neon" | "warning";

function KpiCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: Tone;
  icon: React.ReactNode;
}) {
  const toneMap: Record<Tone, string> = {
    primary: "text-primary border-primary/40",
    accent: "text-accent border-accent/40",
    neon: "text-neon border-neon/40",
    warning: "text-warning border-warning/40",
  };
  return (
    <div className={`corner-frame rounded-sm border bg-card/60 p-4 ${toneMap[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="label-mono text-muted-foreground">{label}</span>
        <span className={toneMap[tone].split(" ")[0]}>{icon}</span>
      </div>
      <p className={`mt-3 font-mono text-2xl font-bold ${toneMap[tone].split(" ")[0]}`}>
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <p className="label-mono mb-3 text-primary">{title}</p>
      {empty ? <p className="label-mono text-muted-foreground">{empty}</p> : children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/30 p-3">
      <p className="label-mono text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg text-foreground">{value}</p>
    </div>
  );
}
