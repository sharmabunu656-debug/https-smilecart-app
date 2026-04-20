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
import { useShop, type PaymentMethod } from "@/lib/shop-store";
import { formatINR, formatNumberIN } from "@/lib/currency";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ScanLine } from "lucide-react";
import { toast as sonnerToast } from "sonner";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales // GROCER//OS" },
      { name: "description", content: "Record sales by SKU. Auto stock decrement and revenue tracking." },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const { products, sales, findBySku, recordSale } = useShop();
  const [sku, setSku] = React.useState("");
  const [scannerOpen, setScannerOpen] = React.useState(false);

  const matched = sku ? findBySku(sku) : undefined;

  const handleScan = (text: string) => {
    const cleaned = text.trim();
    setSku(cleaned);
    const hit = findBySku(cleaned);
    if (hit) {
      sonnerToast.success(`scanned · ${hit.name}`);
    } else {
      sonnerToast.warning(`scanned ${cleaned} · sku not in catalog`);
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!matched) {
      toast.error("unknown sku");
      return;
    }
    const form = new FormData(e.currentTarget);
    const qty = Number(form.get("qty") ?? 0);
    const payment = String(form.get("payment") ?? "cash") as PaymentMethod;
    if (qty <= 0) {
      toast.error("quantity must be > 0");
      return;
    }
    const result = recordSale({ productId: matched.id, qty, payment });
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(`sale committed · ${formatINR(result.total)}`);
    setSku("");
    e.currentTarget.reset();
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="corner-frame mb-6 rounded-sm border border-border bg-card/40 p-6">
        <p className="label-mono mb-2 text-primary">// point of sale</p>
        <h2 className="font-mono text-2xl font-bold uppercase tracking-wider text-foreground sm:text-3xl">
          record<span className="text-primary">_</span>sale
        </h2>
      </section>

      <section className="mb-6 rounded-sm border border-border bg-card/40 p-4 sm:p-6">
        {products.length === 0 ? (
          <p className="label-mono text-muted-foreground">add a product first.</p>
        ) : (
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="sku">product sku</Label>
              <div className="flex gap-2">
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="MLK-001"
                  list="sku-list"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setScannerOpen(true)}
                  title="scan barcode"
                  aria-label="scan barcode"
                >
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
              <datalist id="sku-list">
                {products.map((p) => (
                  <option key={p.id} value={p.sku}>
                    {p.name}
                  </option>
                ))}
              </datalist>
              {sku && !matched && (
                <p className="label-mono text-warning">sku not found</p>
              )}
              {matched && (
                <p className="label-mono text-neon">
                  ✓ {matched.name} · stock {formatNumberIN(matched.stock)} · {formatINR(matched.sellingPrice)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">quantity</Label>
              <Input id="qty" name="qty" type="number" min="1" placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment">payment</Label>
              <select
                id="payment"
                name="payment"
                suppressHydrationWarning
                className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm uppercase tracking-wide text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="cash">cash</option>
                <option value="card">card</option>
                <option value="mobile">mobile</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="neon" className="w-full" disabled={!matched}>
                commit sale
              </Button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-sm border border-border bg-card/40 p-4 sm:p-6">
        <p className="label-mono mb-3 text-primary">// sales log</p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>date</TableHead>
                <TableHead>product</TableHead>
                <TableHead className="text-right">qty</TableHead>
                <TableHead className="text-right">unit ₹</TableHead>
                <TableHead>payment</TableHead>
                <TableHead className="text-right">total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    no sales yet.
                  </TableCell>
                </TableRow>
              )}
              {sales.map((s) => {
                const product = products.find((p) => p.id === s.productId);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="label-mono text-muted-foreground">
                      {new Date(s.date).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="font-mono">{product?.name ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumberIN(s.qty)}</TableCell>
                    <TableCell className="text-right font-mono">{formatINR(s.unitPrice)}</TableCell>
                    <TableCell className="label-mono text-muted-foreground">{s.payment}</TableCell>
                    <TableCell className="text-right font-mono text-neon">{formatINR(s.total)}</TableCell>
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
