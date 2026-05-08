import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShopAuth } from "@/lib/shop-auth";
import { formatINR } from "@/lib/currency";
import { Package } from "lucide-react";

export const Route = createFileRoute("/shop/orders/")({
  component: OrdersPage,
});

type Order = {
  id: string;
  status: string;
  payment_method: string;
  total: number;
  placed_at: string;
  order_items: { product_name: string; qty: number; image_url: string | null }[];
};

const STATUS_LABEL: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<string, string> = {
  placed: "bg-shop-warning/30 text-shop-fg",
  confirmed: "bg-shop-primary-soft text-shop-primary",
  packed: "bg-shop-primary-soft text-shop-primary",
  out_for_delivery: "bg-shop-accent text-white",
  delivered: "bg-shop-accent-soft text-shop-accent",
  cancelled: "bg-shop-bg text-shop-danger",
};

function OrdersPage() {
  const { user, loading } = useShopAuth();
  const qc = useQueryClient();

  const ordersQ = useQuery({
    queryKey: ["shop", "orders", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, payment_method, total, placed_at, order_items(product_name, qty, image_url)")
        .eq("user_id", user!.id)
        .order("placed_at", { ascending: false });
      if (error) throw error;
      return (data as Order[]) ?? [];
    },
    staleTime: 30_000,
  });

  // Live updates — invalidate cached orders when the user's orders change.
  React.useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["shop", "orders", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const orders = ordersQ.data ?? [];
  const busy = ordersQ.isLoading && !ordersQ.data;

  if (loading || busy) return <div className="h-40 animate-pulse rounded-2xl bg-shop-card" />;

  if (!user) {
    return (
      <p className="py-12 text-center text-sm text-shop-muted">
        Please <Link to="/shop/auth" className="text-shop-primary underline">sign in</Link> to see your orders.
      </p>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Package className="h-12 w-12 text-shop-primary" />
        <h2 className="font-display text-xl text-shop-fg">No orders yet</h2>
        <p className="max-w-xs text-sm text-shop-muted">When you place an order, it'll show up here.</p>
        <Link to="/shop" className="mt-2 rounded-full bg-shop-primary px-6 py-3 text-sm font-bold text-white">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <h1 className="font-display text-xl text-shop-fg">My orders</h1>
      {orders.map((o) => (
        <Link
          key={o.id}
          to="/shop/orders/$id"
          params={{ id: o.id }}
          className="block rounded-2xl bg-shop-card p-4 shadow-shop transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-shop-muted">
              {new Date(o.placed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_TONE[o.status] ?? ""}`}>
              {STATUS_LABEL[o.status] ?? o.status}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {o.order_items.slice(0, 4).map((it, i) => (
              <span key={i} className="flex h-9 w-9 items-center justify-center rounded-lg bg-shop-primary-soft text-xl">
                {it.image_url ?? "🛒"}
              </span>
            ))}
            {o.order_items.length > 4 && (
              <span className="text-xs text-shop-muted">+{o.order_items.length - 4}</span>
            )}
          </div>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-xs text-shop-muted">
              {o.order_items.length} items · {o.payment_method.toUpperCase()}
            </p>
            <p className="text-base font-bold text-shop-fg">{formatINR(o.total)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
