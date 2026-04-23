import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Check, Clock, Package, Truck, Home, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShopAuth } from "@/lib/shop-auth";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/shop/orders/$id")({
  component: OrderDetail,
});

type Order = {
  id: string;
  status: "placed" | "confirmed" | "packed" | "out_for_delivery" | "delivered" | "cancelled";
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  notes: string | null;
  placed_at: string;
  order_items: { id: string; product_name: string; unit: string; image_url: string | null; unit_price: number; qty: number; line_total: number }[];
};

const STEPS = [
  { key: "placed", label: "Order placed", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: Check },
  { key: "packed", label: "Packed", icon: Package },
  { key: "out_for_delivery", label: "Out for delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
] as const;

function OrderDetail() {
  const { id } = Route.useParams();
  const { user } = useShopAuth();
  const [order, setOrder] = React.useState<Order | null>(null);
  const [busy, setBusy] = React.useState(true);

  const load = React.useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .maybeSingle();
    setOrder(data as Order | null);
    setBusy(false);
  }, [id]);

  React.useEffect(() => {
    load();
    const ch = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, load]);

  if (busy) return <div className="h-40 animate-pulse rounded-2xl bg-shop-card" />;
  if (!order) return <p className="py-12 text-center text-sm text-shop-muted">Order not found.</p>;

  const stepIdx = STEPS.findIndex((s) => s.key === order.status);
  const cancelled = order.status === "cancelled";

  const cancel = async () => {
    if (!user) return;
    if (!confirm("Cancel this order?")) return;
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Order cancelled");
      load();
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="rounded-2xl bg-gradient-to-br from-shop-primary to-[oklch(0.55_0.2_15)] p-4 text-white shadow-shop">
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Order #{order.id.slice(0, 8)}</p>
        <h1 className="mt-1 font-display text-xl">
          {cancelled ? "Cancelled" : STEPS[stepIdx]?.label ?? "Processing"}
        </h1>
        <p className="text-xs opacity-90">
          Placed {new Date(order.placed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      {!cancelled && (
        <section className="rounded-2xl bg-shop-card p-4 shadow-shop">
          <h2 className="mb-3 text-sm font-bold text-shop-fg">Tracking</h2>
          <ol className="space-y-3">
            {STEPS.map((step, i) => {
              const done = i <= stepIdx;
              const active = i === stepIdx;
              const Icon = step.icon;
              return (
                <li key={step.key} className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${done ? "bg-shop-accent text-white" : "bg-shop-bg text-shop-muted"} ${active ? "ring-4 ring-shop-accent/30" : ""}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={`text-sm ${done ? "font-bold text-shop-fg" : "text-shop-muted"}`}>{step.label}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {cancelled && (
        <section className="rounded-2xl bg-shop-card p-4 shadow-shop">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-shop-danger text-white">
              <X className="h-4 w-4" />
            </span>
            <p className="text-sm font-bold text-shop-danger">This order was cancelled</p>
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-shop-card p-4 shadow-shop">
        <h2 className="mb-2 text-sm font-bold text-shop-fg">Items</h2>
        <ul className="divide-y divide-shop-border">
          {order.order_items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-shop-primary-soft text-2xl">
                {it.image_url ?? "🛒"}
              </span>
              <div className="flex-1 text-sm">
                <p className="font-semibold text-shop-fg">{it.product_name}</p>
                <p className="text-xs text-shop-muted">{it.unit} · Qty {it.qty}</p>
              </div>
              <p className="text-sm font-bold text-shop-fg">{formatINR(it.line_total)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-shop-card p-4 shadow-shop text-sm">
        <h2 className="mb-2 text-sm font-bold text-shop-fg">Bill</h2>
        <Row label="Subtotal" value={formatINR(order.subtotal)} />
        <Row label="Delivery" value={order.delivery_fee === 0 ? "FREE" : formatINR(order.delivery_fee)} />
        <div className="my-2 h-px bg-shop-border" />
        <Row label="Total paid" value={formatINR(order.total)} bold />
        <p className="mt-1 text-xs text-shop-muted">Payment · {order.payment_method.toUpperCase()}</p>
      </section>

      <section className="rounded-2xl bg-shop-card p-4 shadow-shop text-sm">
        <h2 className="mb-1 text-sm font-bold text-shop-fg">Delivery to</h2>
        <p className="font-semibold text-shop-fg">{order.recipient_name}</p>
        <p className="text-xs text-shop-muted">
          {order.line1}{order.line2 ? `, ${order.line2}` : ""}, {order.city}, {order.state} {order.pincode}
        </p>
        <p className="text-xs text-shop-muted">{order.phone}</p>
        {order.notes && <p className="mt-1 text-xs italic text-shop-muted">"{order.notes}"</p>}
      </section>

      {(order.status === "placed" || order.status === "confirmed") && (
        <button
          onClick={cancel}
          className="w-full rounded-full border border-shop-danger py-3 text-sm font-bold text-shop-danger transition active:scale-95"
        >
          Cancel order
        </button>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-shop-muted">{label}</span>
      <span className={bold ? "text-base font-bold text-shop-fg" : "text-shop-fg"}>{value}</span>
    </div>
  );
}
