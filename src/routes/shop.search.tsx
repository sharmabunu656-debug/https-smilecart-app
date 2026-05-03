import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ShopProduct } from "@/components/shop/ProductCard";
import { useShopUserItems } from "@/lib/shop-user-items";

export const Route = createFileRoute("/shop/search")({
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const { cart, wishlist, setCartQty, setWishlistFor } = useShopUserItems();

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  const query = useQuery({
    queryKey: ["shop", "search", debouncedQ],
    queryFn: async (): Promise<ShopProduct[]> => {
      let qb = supabase
        .from("shop_products")
        .select("id, name, description, image_url, unit, price, mrp, stock")
        .eq("is_active", true)
        .order("name");
      if (debouncedQ) qb = qb.ilike("name", `%${debouncedQ}%`);
      const { data, error } = await qb.limit(50);
      if (error) throw error;
      return data ?? [];
    },
    // Cache the empty-query "all products" view aggressively so the page is instant.
    meta: { persist: debouncedQ === "" },
    staleTime: 60_000,
  });

  const results = query.data ?? [];
  const loading = query.isLoading && !query.data;

  return (
    <div className="space-y-4">
      <div className="sticky top-[60px] z-10 -mx-4 bg-shop-bg px-4 pb-2 pt-1">
        <label className="flex items-center gap-2 rounded-full bg-shop-card px-4 py-2.5 shadow-shop">
          <Search className="h-4 w-4 text-shop-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for products"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-shop-muted"
          />
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-shop-card" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="py-12 text-center text-sm text-shop-muted">
          No products match "{q}".
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {results.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              inWishlist={wishlist.has(p.id)}
              cartQty={cart[p.id] ?? 0}
              onCartChange={(qty) => setCartQty(p.id, qty)}
              onWishlistChange={(on) => setWishlistFor(p.id, on)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
