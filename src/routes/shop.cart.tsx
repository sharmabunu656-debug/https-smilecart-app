import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShopAuth } from "@/lib/shop-auth";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/shop/cart")({
  component: CartPage,
});

type CartRow = {
  id: string;
  qty: number;
  product_id: string;
  shop_products: {
    id: string;
    name: string;
    image_url: string | null;
    unit: string;
    price: number;
    mrp: number;
    stock: number;
  } | null;
};

function CartPage() {
  const { user, loading } = useShopAuth();
  const navigate = useNavigate();
  const [items, setItems] = React.useState<CartRow[]>([]);
  const [busy, setBusy] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!user) {
      setItems([]);
      setBusy(false);
      return;
    }
    const { data } = await supabase
      .from("cart_items")
      .select("id, qty, product_id, shop_products(id, name, image_url, unit, price, mrp, stock)")
      .eq("user_id", user.id)
      .order("created_at");
    setItems((data as CartRow[]) ?? []);
    setBusy(false);
  }, [user]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading || busy) {
    return <div className="h-40 animate-pulse rounded-2xl bg-shop-card" />;
  }

  if (!user) {
    return (
      <EmptyState
        emoji="🔐"
        title="Sign in to see your cart"
        body="Your cart is saved to your account so you can pick up where you left off."
        action={
          <Link
            to="/shop/auth"
            className="rounded-full bg-shop-primary px-6 py-3 text-sm font-bold text-white"
          >
            Sign in
          </Link>
        }
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        title="Your cart is empty"
        body="Add fresh fruits, snacks and daily essentials to get started."
        action={
          <Link
            to="/shop"
            className="rounded-full bg-shop-primary px-6 py-3 text-sm font-bold text-white"
          >
            Start shopping
          </Link>
        }
      />
    );
  }

  const subtotal = items.reduce(
    (s, r) => s + (r.shop_products ? r.shop_products.price * r.qty : 0),
    0,
  );
  const savings = items.reduce(
    (s, r) =>
      s + (r.shop_products ? Math.max(0, (r.shop_products.mrp - r.shop_products.price) * r.qty) : 0),
    0,
  );
  const deliveryFee = subtotal >= 199 || subtotal === 0 ? 0 : 25;
  const total = subtotal + deliveryFee;

  const setQty = async (row: CartRow, next: number) => {
    if (!row.shop_products) return;
    if (next > row.shop_products.stock) return toast.error("Not enough stock");
    if (next <= 0) {
      await supabase.from("cart_items").delete().eq("id", row.id);
    } else {
      await supabase.from("cart_items").update({ qty: next }).eq("id", row.id);
    }
    load();
  };

  const removeItem = async (row: CartRow) => {
    await supabase.from("cart_items").delete().eq("id", row.id);
    load();
  };

  return (
    <div className="space-y-4 pb-32">
      <h1 className="font-display text-xl text-shop-fg">Your cart ({items.length})</h1>
      <ul className="space-y-2">
        {items.map((row) => {
          if (!row.shop_products) return null;
          const p = row.shop_products;
          return (
            <li key={row.id} className="flex items-center gap-3 rounded-2xl bg-shop-card p-3 shadow-shop">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-shop-primary-soft">
                <span className="text-3xl">{p.image_url ?? "🛒"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold text-shop-fg">{p.name}</p>
                <p className="text-[11px] text-shop-muted">{p.unit}</p>
                <p className="mt-1 text-sm font-bold text-shop-fg">{formatINR(p.price * row.qty)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => removeItem(row)}
                  className="text-shop-muted transition active:scale-90"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2 rounded-full bg-shop-primary px-1.5 py-1 text-white">
                  <button
                    onClick={() => setQty(row, row.qty - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full transition active:scale-90"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-bold">{row.qty}</span>
                  <button
                    onClick={() => setQty(row, row.qty + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full transition active:scale-90"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl bg-shop-card p-4 shadow-shop">
        <h2 className="text-sm font-bold text-shop-fg">Bill summary</h2>
        <dl className="mt-2 space-y-1 text-sm">
          <Row label="Subtotal" value={formatINR(subtotal)} />
          {savings > 0 && <Row label="You save" value={`- ${formatINR(savings)}`} accent />}
          <Row label="Delivery fee" value={deliveryFee === 0 ? "FREE" : formatINR(deliveryFee)} accent={deliveryFee === 0} />
          <div className="my-2 h-px bg-shop-border" />
          <Row label="Total" value={formatINR(total)} bold />
        </dl>
        {subtotal < 199 && subtotal > 0 && (
          <p className="mt-2 text-[11px] text-shop-muted">
            Add {formatINR(199 - subtotal)} more for free delivery.
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-shop-border bg-shop-bg/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3">
          <div>
            <p className="text-[11px] text-shop-muted">Total</p>
            <p className="text-lg font-bold text-shop-fg">{formatINR(total)}</p>
          </div>
          <button
            onClick={() => navigate({ to: "/shop/checkout" })}
            className="ml-auto flex items-center gap-2 rounded-full bg-shop-primary px-6 py-3 text-sm font-bold text-white transition active:scale-95"
          >
            <ShoppingBag className="h-4 w-4" /> Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={accent ? "text-shop-accent" : "text-shop-muted"}>{label}</dt>
      <dd className={`${bold ? "text-base font-bold text-shop-fg" : accent ? "text-shop-accent font-semibold" : "text-shop-fg"}`}>
        {value}
      </dd>
    </div>
  );
}

function EmptyState({ emoji, title, body, action }: { emoji: string; title: string; body: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="text-6xl">{emoji}</span>
      <h2 className="font-display text-xl text-shop-fg">{title}</h2>
      <p className="max-w-xs text-sm text-shop-muted">{body}</p>
      <div className="mt-2">{action}</div>
    </div>
  );
}
