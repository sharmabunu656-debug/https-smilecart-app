import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Search, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useShop } from "@/lib/shop-store";
import { formatINR, formatNumberIN } from "@/lib/currency";
import { LabelSheet, type LabelItem } from "@/components/LabelSheet";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products // GROCER//OS" },
      { name: "description", content: "Manage product inventory: SKUs, prices, stock, low-stock thresholds." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { products, addProduct } = useShop();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [selected, setSelected] = React.useState<Record<string, number>>({});
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });

  const setQty = (id: string, qty: number) =>
    setSelected((s) => ({ ...s, [id]: Math.max(1, Math.min(99, qty || 1)) }));

  const labelItems: LabelItem[] = React.useMemo(
    () =>
      Object.entries(selected)
        .map(([id, qty]) => {
          const p = products.find((x) => x.id === id);
          if (!p) return null;
          return { sku: p.sku, name: p.name, price: p.sellingPrice, qty };
        })
        .filter((x): x is LabelItem => x !== null),
    [selected, products],
  );

  const totalLabels = labelItems.reduce((sum, it) => sum + it.qty, 0);
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products],
  );

  const filtered = products.filter((p) => {
    const q = query.toLowerCase();
    const matchQ =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);
    const matchC = !category || p.category === category;
    return matchQ && matchC;
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const sku = String(form.get("sku") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    if (!sku || !name) {
      toast.error("sku and name required");
      return;
    }
    addProduct({
      sku,
      name,
      category: String(form.get("category") ?? "general").trim() || "general",
      costPrice: Number(form.get("costPrice") ?? 0),
      sellingPrice: Number(form.get("sellingPrice") ?? 0),
      stock: Number(form.get("stock") ?? 0),
      lowStockAt: Number(form.get("lowStockAt") ?? 5),
    });
    toast.success(`${name} added to inventory`);
    e.currentTarget.reset();
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="corner-frame mb-6 rounded-sm border border-border bg-card/40 p-6">
        <p className="label-mono mb-2 text-primary">// inventory</p>
        <h2 className="font-mono text-2xl font-bold uppercase tracking-wider text-foreground sm:text-3xl">
          product<span className="text-primary">_</span>catalog
        </h2>
      </section>

      <section className="mb-6 rounded-sm border border-border bg-card/40 p-4 sm:p-6">
        <p className="label-mono mb-4 text-primary">// add product</p>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field id="sku" label="sku" placeholder="MLK-001" />
          <Field id="name" label="name" placeholder="product name" />
          <Field id="category" label="category" placeholder="dairy / produce" />
          <Field id="costPrice" label="cost price (₹)" type="number" placeholder="0" />
          <Field id="sellingPrice" label="selling price (₹)" type="number" placeholder="0" />
          <Field id="stock" label="opening stock" type="number" placeholder="0" />
          <Field id="lowStockAt" label="low-stock at" type="number" placeholder="5" />
          <div className="flex items-end">
            <Button type="submit" variant="neon" className="w-full">
              <Plus /> add to inventory
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-sm border border-border bg-card/40 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="grow space-y-1.5">
            <Label htmlFor="q">
              <Search className="mr-1 inline h-3 w-3" /> search
            </Label>
            <Input
              id="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="name, sku, category"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat">filter category</Label>
            <select
              id="cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 rounded-sm border border-input bg-background px-3 font-mono text-sm uppercase tracking-wide text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">all</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>sku</TableHead>
                <TableHead>name</TableHead>
                <TableHead>category</TableHead>
                <TableHead className="text-right">cost</TableHead>
                <TableHead className="text-right">selling</TableHead>
                <TableHead className="text-right">margin</TableHead>
                <TableHead className="text-right">stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    no products match.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => {
                const margin = p.sellingPrice - p.costPrice;
                const low = p.stock <= p.lowStockAt;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-primary">{p.sku}</TableCell>
                    <TableCell className="font-mono">{p.name}</TableCell>
                    <TableCell className="label-mono text-muted-foreground">{p.category}</TableCell>
                    <TableCell className="text-right font-mono">{formatINR(p.costPrice)}</TableCell>
                    <TableCell className="text-right font-mono">{formatINR(p.sellingPrice)}</TableCell>
                    <TableCell className={`text-right font-mono ${margin >= 0 ? "text-neon" : "text-warning"}`}>
                      {formatINR(margin)}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${low ? "text-warning" : "text-foreground"}`}>
                      {formatNumberIN(p.stock)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}

function Field({
  id,
  label,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} placeholder={placeholder} step={type === "number" ? "0.01" : undefined} />
    </div>
  );
}
