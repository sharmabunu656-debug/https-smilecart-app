import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { MapPin, Plus, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShopAuth } from "@/lib/shop-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/shop/addresses")({
  component: AddressesPage,
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

function AddressesPage() {
  const { user, loading } = useShopAuth();
  const [items, setItems] = React.useState<Address[]>([]);
  const [busy, setBusy] = React.useState(true);
  const [adding, setAdding] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!user) return setBusy(false);
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at");
    setItems((data as Address[]) ?? []);
    setBusy(false);
  }, [user]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading || busy) return <div className="h-40 animate-pulse rounded-2xl bg-shop-card" />;

  if (!user) {
    return (
      <p className="py-12 text-center text-sm text-shop-muted">
        Please <Link to="/shop/auth" className="text-shop-primary underline">sign in</Link> to manage addresses.
      </p>
    );
  }

  const setDefault = async (id: string) => {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("addresses").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-3 pb-4">
      <h1 className="font-display text-xl text-shop-fg">Delivery addresses</h1>

      {items.map((a) => (
        <article key={a.id} className="rounded-2xl bg-shop-card p-4 shadow-shop">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-shop-primary-soft text-shop-primary">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-shop-fg">{a.label}</p>
                {a.is_default && (
                  <span className="rounded-full bg-shop-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase text-shop-accent">
                    Default
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-shop-fg">{a.recipient_name} · {a.phone}</p>
              <p className="text-xs text-shop-muted">
                {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
              </p>
              <div className="mt-2 flex gap-3 text-xs">
                {!a.is_default && (
                  <button onClick={() => setDefault(a.id)} className="font-semibold text-shop-primary">
                    <Star className="mr-1 inline h-3 w-3" /> Set default
                  </button>
                )}
                <button onClick={() => remove(a.id)} className="font-semibold text-shop-danger">
                  <Trash2 className="mr-1 inline h-3 w-3" /> Remove
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}

      {adding ? (
        <AddressForm
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
          isFirst={items.length === 0}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-shop-border bg-shop-card py-4 text-sm font-bold text-shop-primary transition active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Add new address
        </button>
      )}
    </div>
  );
}

export function AddressForm({
  onCancel,
  onSaved,
  isFirst,
}: {
  onCancel: () => void;
  onSaved: () => void;
  isFirst: boolean;
}) {
  const { user, profile } = useShopAuth();
  const [form, setForm] = React.useState({
    label: "Home",
    recipient_name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [saving, setSaving] = React.useState(false);

  const change = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    if (!user) return;
    if (!form.recipient_name || !form.phone || !form.line1 || !form.city || !form.state || !form.pincode) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("addresses").insert({
      ...form,
      line2: form.line2 || null,
      user_id: user.id,
      is_default: isFirst,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Address saved");
      onSaved();
    }
  };

  return (
    <div className="space-y-2 rounded-2xl bg-shop-card p-4 shadow-shop">
      <h2 className="text-sm font-bold text-shop-fg">New address</h2>
      <Input value={form.label} onChange={change("label")} placeholder="Label (Home / Work)" />
      <div className="grid grid-cols-2 gap-2">
        <Input value={form.recipient_name} onChange={change("recipient_name")} placeholder="Full name *" />
        <Input value={form.phone} onChange={change("phone")} placeholder="Phone *" type="tel" />
      </div>
      <Input value={form.line1} onChange={change("line1")} placeholder="House / Flat / Street *" />
      <Input value={form.line2} onChange={change("line2")} placeholder="Landmark (optional)" />
      <div className="grid grid-cols-2 gap-2">
        <Input value={form.city} onChange={change("city")} placeholder="City *" />
        <Input value={form.state} onChange={change("state")} placeholder="State *" />
      </div>
      <Input value={form.pincode} onChange={change("pincode")} placeholder="PIN code *" />
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-full border border-shop-border py-2 text-xs font-bold uppercase text-shop-fg">
          Cancel
        </button>
        <button onClick={save} disabled={saving} className="flex-1 rounded-full bg-shop-primary py-2 text-xs font-bold uppercase text-white disabled:opacity-50">
          Save address
        </button>
      </div>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl bg-shop-bg px-3 py-2 text-sm outline-none ring-1 ring-shop-border focus:ring-shop-primary"
    />
  );
}
