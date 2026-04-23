import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { ShieldCheck, Package2, ListOrdered, TrendingUp } from "lucide-react";
import { useShopAuth } from "@/lib/shop-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/shop/admin")({
  component: AdminPanel,
});

type Tab = "orders" | "products" | "analytics";

const STATUSES = ["placed", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"] as const;

function AdminPanel() {
  const { isAdmin, loading, user } = useShopAuth();
  const [tab, setTab] = React.useState<Tab>("orders");
  const [becoming, setBecoming] = React.useState(false);

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-shop-card" />;

  if (!user) {
    return <p className="py-12 text-center text-sm text-shop-muted">Sign in to access the admin panel.</p>;
  }

  // Bootstrap: if no admins exist anywhere, the first signed-in user can claim admin.
  if (!isAdmin) {
    const claim = async () => {
      setBecoming(true);
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) > 0) {
        toast.error("An admin already exists. Ask them to grant you access.");
        setBecoming(false);
        return;
      }
      const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "admin" });
      setBecoming(false);
      if (error) toast.error(error.message);
      else {
        toast.success("You are now an admin. Reload to continue.");
        setTimeout(() => window.location.reload(), 800);
      }
    };
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <ShieldCheck className="h-12 w-12 text-shop-primary" />
        <h2 className="font-display text-xl text-shop-fg">Admin access required</h2>
        <p className="max-w-xs text-sm text-shop-muted">
          The seller / admin panel manages products, orders and analytics.
        </p>
        <button
          onClick={claim}
          disabled={becoming}
          className="rounded-full bg-shop-primary px-6 py-3 text-sm font-bold text-white"
        >
          Claim admin (first user only)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <header className="rounded-2xl bg-gradient-to-br from-shop-accent to-[oklch(0.55_0.18_160)] p-4 text-white shadow-shop">
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Seller dashboard</p>
        <h1 className="font-display text-xl">FreshKart admin</h1>
      </header>

      <nav className="flex gap-2 overflow-x-auto">
        <TabBtn active={tab === "orders"} onClick={() => setTab("orders")} icon={<ListOrdered className="h-4 w-4" />}>Orders</TabBtn>
        <TabBtn active={tab === "products"} onClick={() => setTab("products")} icon={<Package2 className="h-4 w-4" />}>Products</TabBtn>
        <TabBtn active={tab === "analytics"} onClick={() => setTab("analytics")} icon={<TrendingUp className="h-4 w-4" />}>Analytics</TabBtn>
      </nav>

      {tab === "orders" && <AdminOrders />}
      {tab === "products" && <AdminProducts />}
      {tab === "analytics" && <AdminAnalytics />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${active ? "bg-shop-primary text-white" : "bg-shop-card text-shop-muted shadow-shop"}`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ============ ORDERS ============ */
type AdminOrder = {
  id: string;
  status: typeof STATUSES[number];
  total: number;
  payment_method: string;
  recipient_name: string;
  city: string;
  placed_at: string;
};

function AdminOrders() {
  const [orders, setOrders] = React.useState<AdminOrder[]>([]);
  const [busy, setBusy] = React.useState(true);

  const load = React.useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, status, total, payment_method, recipient_name, city, placed_at")
      .order("placed_at", { ascending: false })
      .limit(100);
    setOrders((data as AdminOrder[]) ?? []);
    setBusy(false);
  }, []);

  React.useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  if (busy) return <div className="h-40 animate-pulse rounded-2xl bg-shop-card" />;

  const setStatus = async (id: string, status: AdminOrder["status"]) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(`Marked as ${status}`);
  };

  if (orders.length === 0)
    return <p className="py-8 text-center text-sm text-shop-muted">No orders yet.</p>;

  return (
    <ul className="space-y-2">
      {orders.map((o) => (
        <li key={o.id} className="rounded-2xl bg-shop-card p-3 shadow-shop">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-shop-muted">#{o.id.slice(0, 8)}</span>
            <span className="text-shop-muted">{new Date(o.placed_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
          </div>
          <p className="mt-1 text-sm font-bold text-shop-fg">{o.recipient_name} · {o.city}</p>
          <p className="text-xs text-shop-muted">{o.payment_method.toUpperCase()} · {formatINR(o.total)}</p>
          <select
            value={o.status}
            onChange={(e) => setStatus(o.id, e.target.value as AdminOrder["status"])}
            className="mt-2 w-full rounded-full bg-shop-bg px-3 py-1.5 text-xs font-semibold text-shop-fg ring-1 ring-shop-border focus:ring-shop-primary"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );
}

/* ============ PRODUCTS ============ */
type AdminProduct = {
  id: string;
  name: string;
  unit: string;
  price: number;
  mrp: number;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
};

function AdminProducts() {
  const [products, setProducts] = React.useState<AdminProduct[]>([]);
  const [busy, setBusy] = React.useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("shop_products")
      .select("id, name, unit, price, mrp, stock, is_active, is_featured")
      .order("name");
    setProducts((data as AdminProduct[]) ?? []);
    setBusy(false);
  };
  React.useEffect(() => {
    load();
  }, []);

  if (busy) return <div className="h-40 animate-pulse rounded-2xl bg-shop-card" />;

  const update = async (id: string, patch: Partial<AdminProduct>) => {
    const { error } = await supabase.from("shop_products").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <ul className="space-y-2">
      {products.map((p) => (
        <li key={p.id} className="rounded-2xl bg-shop-card p-3 shadow-shop">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-shop-fg">{p.name}</p>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={p.is_active}
                onChange={(e) => update(p.id, { is_active: e.target.checked })}
                className="accent-shop-primary"
              />
              Active
            </label>
          </div>
          <p className="text-[11px] text-shop-muted">{p.unit}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <NumField label="Price ₹" value={p.price} onSave={(v) => update(p.id, { price: v })} />
            <NumField label="MRP ₹" value={p.mrp} onSave={(v) => update(p.id, { mrp: v })} />
            <NumField label="Stock" value={p.stock} onSave={(v) => update(p.id, { stock: v })} />
          </div>
          <label className="mt-2 flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={p.is_featured}
              onChange={(e) => update(p.id, { is_featured: e.target.checked })}
              className="accent-shop-primary"
            />
            Show on home
          </label>
        </li>
      ))}
    </ul>
  );
}

function NumField({ label, value, onSave }: { label: string; value: number; onSave: (v: number) => void }) {
  const [v, setV] = React.useState(String(value));
  React.useEffect(() => setV(String(value)), [value]);
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase text-shop-muted">{label}</span>
      <input
        type="number"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const n = Number(v);
          if (!Number.isNaN(n) && n !== value) onSave(n);
        }}
        className="w-full rounded-md bg-shop-bg px-2 py-1 text-xs ring-1 ring-shop-border focus:ring-shop-primary"
      />
    </label>
  );
}

/* ============ ANALYTICS ============ */
function AdminAnalytics() {
  const [stats, setStats] = React.useState<{ orders: number; revenue: number; pending: number; lowStock: number } | null>(null);

  React.useEffect(() => {
    (async () => {
      const [oRes, lowRes] = await Promise.all([
        supabase.from("orders").select("status, total").neq("status", "cancelled"),
        supabase.from("shop_products").select("id", { count: "exact", head: true }).lte("stock", 5),
      ]);
      const orders = oRes.data ?? [];
      setStats({
        orders: orders.length,
        revenue: orders.reduce((s, o) => s + Number(o.total), 0),
        pending: orders.filter((o) => o.status !== "delivered").length,
        lowStock: lowRes.count ?? 0,
      });
    })();
  }, []);

  if (!stats) return <div className="h-40 animate-pulse rounded-2xl bg-shop-card" />;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat label="Total revenue" value={formatINR(stats.revenue)} tone="primary" />
      <Stat label="Orders" value={String(stats.orders)} tone="accent" />
      <Stat label="Pending fulfillment" value={String(stats.pending)} tone="warning" />
      <Stat label="Low stock items" value={String(stats.lowStock)} tone="danger" />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "primary" | "accent" | "warning" | "danger" }) {
  const map: Record<string, string> = {
    primary: "bg-shop-primary text-white",
    accent: "bg-shop-accent text-white",
    warning: "bg-shop-warning/30 text-shop-fg",
    danger: "bg-shop-danger/15 text-shop-danger",
  };
  return (
    <div className={`rounded-2xl p-4 shadow-shop ${map[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 font-display text-xl">{value}</p>
    </div>
  );
}
