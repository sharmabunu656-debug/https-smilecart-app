import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

import { useShop } from "@/lib/shop-store";
import { formatINR, formatNumberIN } from "@/lib/currency";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports // GROCER//OS" },
      { name: "description", content: "Daily, weekly and monthly P&L reports for your shop." },
    ],
  }),
  component: ReportsPage,
});

type Range = "day" | "week" | "month";

function inRange(date: Date, range: Range, now: Date) {
  const ms = now.getTime() - date.getTime();
  if (range === "day")
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  if (range === "week") return ms >= 0 && ms <= 7 * 24 * 60 * 60 * 1000;
  return ms >= 0 && ms <= 30 * 24 * 60 * 60 * 1000;
}

function ReportsPage() {
  const { sales, purchases, products } = useShop();
  const [range, setRange] = React.useState<Range>("day");

  const now = new Date();
  const filteredSales = sales.filter((s) => inRange(new Date(s.date), range, now));
  const filteredPurchases = purchases.filter((p) => inRange(new Date(p.date), range, now));

  const revenue = filteredSales.reduce((a, s) => a + s.total, 0);
  const expenses = filteredPurchases.reduce((a, p) => a + p.totalCost, 0);
  const cogs = filteredSales.reduce((a, s) => {
    const pr = products.find((p) => p.id === s.productId);
    return a + (pr ? pr.costPrice * s.qty : 0);
  }, 0);
  const profit = revenue - cogs;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const exportCsv = () => {
    const rows = [
      ["type", "date", "ref", "qty", "amount"],
      ...filteredSales.map((s) => {
        const pr = products.find((p) => p.id === s.productId);
        return ["sale", s.date, pr?.sku ?? s.productId, String(s.qty), String(s.total)];
      }),
      ...filteredPurchases.map((p) => {
        const pr = products.find((x) => x.id === p.productId);
        return ["purchase", p.date, pr?.sku ?? p.productId, String(p.qty), String(p.totalCost)];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grocer-os-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const backup = () => {
    const data = { products, sales, purchases };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grocer-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="corner-frame mb-6 rounded-sm border border-border bg-card/40 p-6">
        <p className="label-mono mb-2 text-primary">// analytics</p>
        <h2 className="font-mono text-2xl font-bold uppercase tracking-wider text-foreground sm:text-3xl">
          profit<span className="text-primary">_</span>and<span className="text-primary">_</span>loss
        </h2>
      </section>

      <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-card/40 p-4">
        <div className="flex gap-1">
          {(["day", "week", "month"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
                range === r
                  ? "border-primary/60 bg-primary/10 text-primary shadow-[var(--glow-primary)]"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "day" ? "today" : r === "week" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="rounded-sm border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground hover:border-primary/60 hover:text-primary"
          >
            export csv
          </button>
          <button
            onClick={backup}
            className="rounded-sm border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground hover:border-primary/60 hover:text-primary"
          >
            backup json
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="revenue" value={formatINR(revenue)} tone="primary" />
        <Stat label="expenses" value={formatINR(expenses)} tone="accent" />
        <Stat label="cogs" value={formatINR(cogs)} tone="warning" />
        <Stat
          label={`profit (${margin.toFixed(1)}%)`}
          value={formatINR(profit)}
          tone={profit >= 0 ? "neon" : "warning"}
        />
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="sales count" value={formatNumberIN(filteredSales.length)} tone="primary" />
        <Stat label="purchase count" value={formatNumberIN(filteredPurchases.length)} tone="accent" />
        <Stat label="units sold" value={formatNumberIN(filteredSales.reduce((a, s) => a + s.qty, 0))} tone="neon" />
      </section>
    </main>
  );
}

type Tone = "primary" | "accent" | "neon" | "warning";

function Stat({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const map: Record<Tone, string> = {
    primary: "text-primary border-primary/40",
    accent: "text-accent border-accent/40",
    neon: "text-neon border-neon/40",
    warning: "text-warning border-warning/40",
  };
  return (
    <div className={`corner-frame rounded-sm border bg-card/60 p-4 ${map[tone]}`}>
      <p className="label-mono text-muted-foreground">{label}</p>
      <p className={`mt-3 font-mono text-2xl font-bold ${map[tone].split(" ")[0]}`}>{value}</p>
    </div>
  );
}
