import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShopAuth } from "@/lib/shop-auth";
import { formatINR } from "@/lib/currency";

export const Route = createFileRoute("/shop/wishlist")({
  component: WishlistPage,
});

type Row = {
  id: string;
  product_id: string;
  shop_products: { id: string; name: string; image_url: string | null; unit: string; price: number; mrp: number } | null;
};

function WishlistPage() {
  const { user, loading } = useShopAuth();
  const qc = useQueryClient();

  const wishlistQ = useQuery({
    queryKey: ["shop", "wishlist", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, product_id, shop_products(id, name, image_url, unit, price, mrp)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Row[]) ?? [];
    },
    meta: { persist: true },
    staleTime: 60_000,
  });

  const items = wishlistQ.data ?? [];
  const busy = wishlistQ.isLoading && !wishlistQ.data;

  if (loading || busy) return <div className="h-40 animate-pulse rounded-2xl bg-shop-card" />;

  if (!user) {
    return (
      <Empty
        title="Sign in to see your wishlist"
        body="Save products you love and find them here."
        cta={<Link to="/shop/auth" className="rounded-full bg-shop-primary px-6 py-3 text-sm font-bold text-white">Sign in</Link>}
      />
    );
  }

  if (items.length === 0) {
    return (
      <Empty
        title="No favorites yet"
        body="Tap the heart on any product to save it for later."
        cta={<Link to="/shop" className="rounded-full bg-shop-primary px-6 py-3 text-sm font-bold text-white">Browse products</Link>}
      />
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <h1 className="font-display text-xl text-shop-fg">Wishlist ({items.length})</h1>
      <ul className="space-y-2">
        {items.map((r) => {
          if (!r.shop_products) return null;
          const p = r.shop_products;
          return (
            <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-shop-card p-3 shadow-shop">
              <Link
                to="/shop/product/$id"
                params={{ id: p.id }}
                className="flex h-16 w-16 items-center justify-center rounded-xl bg-shop-primary-soft"
              >
                <span className="text-3xl">{p.image_url ?? "🛒"}</span>
              </Link>
              <div className="min-w-0 flex-1">
                <Link to="/shop/product/$id" params={{ id: p.id }} className="line-clamp-1 text-sm font-semibold text-shop-fg">
                  {p.name}
                </Link>
                <p className="text-[11px] text-shop-muted">{p.unit}</p>
                <p className="mt-1 text-sm font-bold text-shop-fg">{formatINR(p.price)}</p>
              </div>
              <button
                onClick={async () => {
                  await supabase.from("wishlist_items").delete().eq("id", r.id);
                  load();
                }}
                className="text-shop-muted active:scale-90"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Empty({ title, body, cta }: { title: string; body: string; cta: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Heart className="h-12 w-12 text-shop-primary" />
      <h2 className="font-display text-xl text-shop-fg">{title}</h2>
      <p className="max-w-xs text-sm text-shop-muted">{body}</p>
      <div className="mt-2">{cta}</div>
    </div>
  );
}
