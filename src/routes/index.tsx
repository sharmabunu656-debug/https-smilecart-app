import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Box, ScanLine, Terminal, TrendingUp, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export const formatINR = (value: number) => inrFormatter.format(value);

function Index() {
  return (
    <div className="min-h-screen scanlines">
      {/* Top bar */}
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-primary/60 bg-primary/10 shadow-[var(--glow-primary)]">
              <Terminal className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-foreground">
                GROCER<span className="text-primary">//</span>OS
              </h1>
              <p className="label-mono text-muted-foreground">v0.1 // shop console</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="label-mono hidden text-neon sm:inline">● online</span>
            <Button variant="outline" size="sm">
              <Activity /> sync
            </Button>
            <Button size="sm">new sale</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Hero */}
        <section className="corner-frame mb-8 rounded-sm border border-border bg-card/40 p-6">
          <p className="label-mono mb-2 text-primary">// dashboard</p>
          <h2 className="font-mono text-2xl font-bold uppercase tracking-wider text-foreground sm:text-4xl">
            shop<span className="text-primary">_</span>operations
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Track inventory, log purchases, record sales, and watch your margin in real time.
            Built for shop owners who want speed without spreadsheets.
          </p>
        </section>

        {/* KPI grid */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="sales today" value="₹0.00" tone="primary" icon={<TrendingUp className="h-4 w-4" />} />
          <KpiCard label="expenses today" value="₹0.00" tone="accent" icon={<Box className="h-4 w-4" />} />
          <KpiCard label="profit today" value="₹0.00" tone="neon" icon={<Activity className="h-4 w-4" />} />
          <KpiCard label="low stock" value="0" tone="warning" icon={<AlertTriangle className="h-4 w-4" />} />
        </section>

        {/* Tabs demo */}
        <section className="rounded-sm border border-border bg-card/40 p-4 sm:p-6">
          <Tabs defaultValue="sale">
            <TabsList>
              <TabsTrigger value="sale">new sale</TabsTrigger>
              <TabsTrigger value="purchase">purchase</TabsTrigger>
              <TabsTrigger value="product">add product</TabsTrigger>
            </TabsList>

            <TabsContent value="sale">
              <FormDemo
                title="// record sale"
                fields={[
                  { id: "sku", label: "product sku", placeholder: "e.g. MLK-001" },
                  { id: "qty", label: "quantity", placeholder: "1", type: "number" },
                  { id: "pay", label: "payment method", placeholder: "cash / card / mobile" },
                ]}
                cta="commit sale"
              />
            </TabsContent>

            <TabsContent value="purchase">
              <FormDemo
                title="// log purchase"
                fields={[
                  { id: "sup", label: "supplier", placeholder: "supplier name" },
                  { id: "items", label: "items", placeholder: "items received" },
                  { id: "cost", label: "total cost", placeholder: "0.00", type: "number" },
                ]}
                cta="record"
              />
            </TabsContent>

            <TabsContent value="product">
              <FormDemo
                title="// add product"
                fields={[
                  { id: "name", label: "name", placeholder: "product name" },
                  { id: "cat", label: "category", placeholder: "dairy / produce / ..." },
                  { id: "cp", label: "cost price", placeholder: "0.00", type: "number" },
                  { id: "sp", label: "selling price", placeholder: "0.00", type: "number" },
                  { id: "stk", label: "stock qty", placeholder: "0", type: "number" },
                ]}
                cta="add to inventory"
              />
            </TabsContent>
          </Tabs>
        </section>

        <footer className="mt-10 flex items-center justify-between border-t border-border pt-4">
          <p className="label-mono text-muted-foreground">
            <ScanLine className="mr-1 inline h-3 w-3" /> awaiting backend connection
          </p>
          <p className="label-mono text-muted-foreground">© grocer//os</p>
        </footer>
      </main>
    </div>
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

function FormDemo({
  title,
  fields,
  cta,
}: {
  title: string;
  fields: { id: string; label: string; placeholder: string; type?: string }[];
  cta: string;
}) {
  return (
    <div>
      <p className="label-mono mb-4 text-primary">{title}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <div key={f.id} className="space-y-1.5">
            <Label htmlFor={f.id}>{f.label}</Label>
            <Input id={f.id} type={f.type ?? "text"} placeholder={f.placeholder} />
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="neon">{cta}</Button>
        <Button variant="outline">reset</Button>
        <Button variant="ghost">cancel</Button>
      </div>
    </div>
  );
}
