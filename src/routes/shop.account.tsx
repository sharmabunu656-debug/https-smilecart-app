import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { LogOut, MapPin, Package, Heart, ShieldCheck, ChevronRight, User as UserIcon } from "lucide-react";
import { useShopAuth } from "@/lib/shop-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendly-error";

export const Route = createFileRoute("/shop/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user, profile, isAdmin, loading, signOut, refreshProfile } = useShopAuth();
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-shop-card" />;

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <UserIcon className="h-12 w-12 text-shop-primary" />
        <h2 className="font-display text-xl text-shop-fg">Sign in to FreshKart</h2>
        <p className="max-w-xs text-sm text-shop-muted">Save addresses, track orders and shop faster.</p>
        <Link to="/shop/auth" className="mt-2 rounded-full bg-shop-primary px-6 py-3 text-sm font-bold text-white">
          Sign in or create account
        </Link>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, full_name: name, phone }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(friendlyError(error, "Could not save profile."));
    else {
      toast.success("Profile updated");
      setEditing(false);
      refreshProfile();
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <section className="rounded-2xl bg-shop-card p-4 shadow-shop">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-shop-primary text-lg font-bold text-white">
            {(profile?.full_name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-shop-fg">
              {profile?.full_name ?? "FreshKart shopper"}
            </p>
            <p className="truncate text-xs text-shop-muted">{user.email}</p>
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs font-semibold text-shop-primary"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {editing && (
          <div className="mt-3 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-xl bg-shop-bg px-3 py-2 text-sm outline-none ring-1 ring-shop-border focus:ring-shop-primary"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full rounded-xl bg-shop-bg px-3 py-2 text-sm outline-none ring-1 ring-shop-border focus:ring-shop-primary"
            />
            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-full bg-shop-primary py-2.5 text-xs font-bold uppercase text-white"
            >
              Save
            </button>
          </div>
        )}
      </section>

      <nav className="space-y-2">
        <Item to="/shop/orders" icon={<Package className="h-4 w-4" />} label="My orders" />
        <Item to="/shop/addresses" icon={<MapPin className="h-4 w-4" />} label="Saved addresses" />
        <Item to="/shop/wishlist" icon={<Heart className="h-4 w-4" />} label="Wishlist" />
        {isAdmin && (
          <Item
            to="/shop/admin"
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Admin panel"
            accent
          />
        )}
      </nav>

      <button
        onClick={async () => {
          await signOut();
          toast.success("Signed out");
          navigate({ to: "/shop" });
        }}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-shop-border bg-shop-card py-3 text-sm font-semibold text-shop-danger transition active:scale-95"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}

function Item({ to, icon, label, accent }: { to: string; icon: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl bg-shop-card p-4 shadow-shop transition active:scale-[0.98]"
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${accent ? "bg-shop-accent text-white" : "bg-shop-primary-soft text-shop-primary"}`}>
        {icon}
      </span>
      <span className="flex-1 text-sm font-semibold text-shop-fg">{label}</span>
      <ChevronRight className="h-4 w-4 text-shop-muted" />
    </Link>
  );
}
