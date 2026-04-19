import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases // GROCER//OS" },
      { name: "description", content: "Log supplier purchases. Auto-updates stock and expenses." },
    ],
  }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const { products, purchases, recordPurchase } = useShop();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const productId = String(form.get("productId") ?? "");
    const supplier = String(form.get("supplier") ?? "").trim();
    const qty = Number(form.get("qty") ?? 0);
    const totalCost = Number(form.get("totalCost") ?? 0);
    if (!productId || !supplier || qty <= 0 || totalCost <= 0) {
      toast.error("fill all fields with valid values");
      return;
    }
    const ok = recordPurchase({ productId, supplier, qty, totalCost });
    if (!ok) {
      toast.error("invalid product");
      return;
    }
    toast.success(`purchase logged · stock +${qty}`);
    e.currentTarget.reset();
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="corner-frame mb-6 rounded-sm border border-border bg-card/40 p-6">
        <p className="label-mono mb-2 text-primary">// supply chain</p>
        <h2 className="font-mono text-2xl font-bold uppercase tracking-wider text-foreground sm:text-3xl">
          log<span className="text-primary">_</span>purchase
        </h2>
      </section>

      <section className="mb-6 rounded-sm border border-border bg-card/40 p-4 sm:p-6">
        {products.length === 0 ? (
          <p className="label-mono text-muted-foreground">add a product first.</p>
        ) : (
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="supplier">supplier</Label>
              <Input id="supplier" name="supplier" placeholder="supplier name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="productId">product</Label>
              <select
                id="productId"
                name="productId"
                className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm uppercase tracking-wide text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">quantity</Label>
              <Input id="qty" name="qty" type="number" min="1" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalCost">total cost (₹)</Label>
              <Input id="totalCost" name="totalCost" type="number" step="0.01" min="0" placeholder="0.00" />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" variant="neon">record purchase</Button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-sm border border-border bg-card/40 p-4 sm:p-6">
        <p className="label-mono mb-3 text-primary">// purchase log</p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>date</TableHead>
                <TableHead>supplier</TableHead>
                <TableHead>product</TableHead>
                <TableHead className="text-right">qty</TableHead>
                <TableHead className="text-right">total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    no purchases yet.
                  </TableCell>
                </TableRow>
              )}
              {purchases.map((p) => {
                const product = products.find((x) => x.id === p.productId);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="label-mono text-muted-foreground">
                      {new Date(p.date).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="font-mono">{p.supplier}</TableCell>
                    <TableCell className="font-mono">{product?.name ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumberIN(p.qty)}</TableCell>
                    <TableCell className="text-right font-mono text-accent">{formatINR(p.totalCost)}</TableCell>
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
