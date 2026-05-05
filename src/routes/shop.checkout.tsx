import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Banknote, CreditCard, Smartphone, MapPin, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShopAuth } from "@/lib/shop-auth";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendly-error";
import { AddressForm } from "./shop.addresses";

export const Route = createFileRoute("/shop/checkout")({
  component: CheckoutPage,
});

type Address = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
};

type CartRow = {
  qty: number;
  shop_products: { id: string; name: string; image_url: string | null; unit: string; price: number; mrp: number; stock: number } | null;
};

type PayMethod = "cod" | "upi" | "card";

function CheckoutPage() {
  const { user, loading } = useShopAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = React.useState<Address[]>([]);
  const [cart, setCart] = React.useState<CartRow[]>([]);
  const [busy, setBusy] = React.useState(true);
  const [selectedAddr, setSelectedAddr] = React.useState<string | null>(null);
  const [payment, setPayment] = React.useState<PayMethod>("cod");
  const [notes, setNotes] = React.useState("");
  const [placing, setPlacing] = React.useState(false);
  const [addingAddress, setAddingAddress] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!user) return setBusy(false);
    const [a, c] = await Promise.all([
      supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
      supabase
        .from("cart_items")
        .select("qty, shop_products(id, name, image_url, unit, price, mrp, stock)")
        .eq("user_id", user.id),
    ]);
    setAddresses((a.data as Address[]) ?? []);
    setCart((c.data as CartRow[]) ?? []);
    setSelectedAddr((a.data?.[0] as Address | undefined)?.id ?? null);
    setBusy(false);
  }, [user]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!loading && !user) navigate({ to: "/shop/auth" });
  }, [loading, user, navigate]);

  if (loading || busy) return <div className="h-40 animate-pulse rounded-2xl bg-shop-card" />;
  if (!user) return null;

  const subtotal = cart.reduce((s, r) => s + (r.shop_products ? r.shop_products.price * r.qty : 0), 0);
  const deliveryFee = subtotal >= 199 || subtotal === 0 ? 0 : 25;
  const total = subtotal + deliveryFee;

  const placeOrder = async () => {
    if (cart.length === 0) return toast.error("Your cart is empty");
    const addr = addresses.find((a) => a.id === selectedAddr);
    if (!addr) return toast.error("Pick a delivery address");

    // Validate stock
    for (const r of cart) {
      if (!r.shop_products) continue;
      if (r.qty > r.shop_products.stock) {
        return toast.error(`${r.shop_products.name}: only ${r.shop_products.stock} in stock`);
      }
    }

    setPlacing(true);
    const { data: orderId, error } = await supabase.rpc("place_order", {
      p_address_id: addr.id,
      p_payment_method: payment,
      p_notes: notes || undefined,
    });
    setPlacing(false);
    if (error || !orderId) {
      return toast.error(friendlyError(error, "Could not place order."));
    }
    toast.success("Order placed!");
    navigate({ to: "/shop/orders/$id", params: { id: orderId as string } });
  };

  return (
    <div className="space-y-4 pb-32">
      <h1 className="font-display text-xl text-shop-fg">Checkout</h1>

      {/* Address */}
      <section className="rounded-2xl bg-shop-card p-4 shadow-shop">
        <div className="mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-shop-primary" />
          <h2 className="text-sm font-bold text-shop-fg">Delivery address</h2>
        </div>
        {addresses.length === 0 && !addingAddress ? (
          <button
            onClick={() => setAddingAddress(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-shop-border py-3 text-sm font-bold text-shop-primary"
          >
            <Plus className="h-4 w-4" /> Add delivery address
          </button>
        ) : (
          <div className="space-y-2">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${selectedAddr === a.id ? "border-shop-primary bg-shop-primary-soft" : "border-shop-border bg-shop-bg"}`}
              >
                <input
                  type="radio"
                  name="addr"
                  checked={selectedAddr === a.id}
                  onChange={() => setSelectedAddr(a.id)}
                  className="mt-1 accent-shop-primary"
                />
                <div className="flex-1 text-sm">
                  <p className="font-bold text-shop-fg">{a.label} · {a.recipient_name}</p>
                  <p className="text-xs text-shop-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.pincode}</p>
                  <p className="text-xs text-shop-muted">{a.phone}</p>
                </div>
              </label>
            ))}
            {addingAddress ? (
              <AddressForm
                onCancel={() => setAddingAddress(false)}
                onSaved={() => {
                  setAddingAddress(false);
                  load();
                }}
                isFirst={addresses.length === 0}
              />
            ) : (
              <button onClick={() => setAddingAddress(true)} className="text-xs font-semibold text-shop-primary">
                + Add another address
              </button>
            )}
          </div>
        )}
      </section>

      {/* Payment */}
      <section className="rounded-2xl bg-shop-card p-4 shadow-shop">
        <h2 className="mb-2 text-sm font-bold text-shop-fg">Payment method</h2>
        <div className="space-y-2">
          <PayOption value="cod" current={payment} onSelect={setPayment} icon={<Banknote className="h-4 w-4" />} title="Cash on delivery" sub="Pay when you receive your order" />
          <PayOption value="upi" current={payment} onSelect={setPayment} icon={<Smartphone className="h-4 w-4" />} title="UPI" sub="Pay via Google Pay, PhonePe, BHIM, Paytm" />
          <PayOption value="card" current={payment} onSelect={setPayment} icon={<CreditCard className="h-4 w-4" />} title="Credit / Debit card" sub="Visa, Mastercard, RuPay" />
        </div>
        {(payment === "upi" || payment === "card") && (
          <p className="mt-2 rounded-xl bg-shop-warning/20 p-2 text-[11px] text-shop-fg">
            ⚠️ Online payment is in demo mode. Order will be placed but no money is charged.
          </p>
        )}
      </section>

      {/* Notes */}
      <section className="rounded-2xl bg-shop-card p-4 shadow-shop">
        <h2 className="mb-2 text-sm font-bold text-shop-fg">Delivery notes (optional)</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Ring the bell twice, leave at door"
          rows={2}
          className="w-full rounded-xl bg-shop-bg p-3 text-sm outline-none ring-1 ring-shop-border focus:ring-shop-primary"
        />
      </section>

      {/* Bill */}
      <section className="rounded-2xl bg-shop-card p-4 shadow-shop">
        <h2 className="text-sm font-bold text-shop-fg">{cart.length} items</h2>
        <ul className="mt-2 space-y-1 text-xs text-shop-muted">
          {cart.map((r, i) =>
            r.shop_products ? (
              <li key={i} className="flex justify-between">
                <span>{r.shop_products.name} × {r.qty}</span>
                <span>{formatINR(r.shop_products.price * r.qty)}</span>
              </li>
            ) : null,
          )}
        </ul>
        <div className="my-2 h-px bg-shop-border" />
        <div className="flex justify-between text-sm"><span className="text-shop-muted">Subtotal</span><span className="text-shop-fg">{formatINR(subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-shop-muted">Delivery</span><span className={deliveryFee === 0 ? "text-shop-accent font-semibold" : "text-shop-fg"}>{deliveryFee === 0 ? "FREE" : formatINR(deliveryFee)}</span></div>
        <div className="mt-1 flex justify-between text-base font-bold text-shop-fg"><span>Total</span><span>{formatINR(total)}</span></div>
      </section>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-shop-border bg-shop-bg/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3">
          <Link to="/shop/cart" className="rounded-full border border-shop-border px-4 py-3 text-xs font-bold uppercase text-shop-fg">
            Back
          </Link>
          <button
            onClick={placeOrder}
            disabled={placing || cart.length === 0 || !selectedAddr}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-shop-primary py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
          >
            {placing && <Loader2 className="h-4 w-4 animate-spin" />}
            Place order · {formatINR(total)}
          </button>
        </div>
      </div>
    </div>
  );
}

function PayOption({
  value,
  current,
  onSelect,
  icon,
  title,
  sub,
}: {
  value: PayMethod;
  current: PayMethod;
  onSelect: (v: PayMethod) => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  const active = value === current;
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${active ? "border-shop-primary bg-shop-primary-soft" : "border-shop-border bg-shop-bg"}`}>
      <input type="radio" name="pay" checked={active} onChange={() => onSelect(value)} className="accent-shop-primary" />
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? "bg-shop-primary text-white" : "bg-shop-card text-shop-muted"}`}>{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-bold text-shop-fg">{title}</p>
        <p className="text-[11px] text-shop-muted">{sub}</p>
      </div>
    </label>
  );
}
