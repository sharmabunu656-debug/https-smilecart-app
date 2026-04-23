import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ShopProduct } from "@/components/shop/ProductCard";
import { useShopUserItems } from "@/lib/shop-user-items";

export const Route = createFileRoute("/shop/category/$slug")({
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const [name, setName] = React.useState("");
  const [emoji, setEmoji] = React.useState<string | null>(null);
  const [products, setProducts] = React.useState<ShopProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { cart, wishlist, setCartQty, setWishlistFor } = useShopUserItems();

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: cat } = await supabase
        .from("categories")
        .select("id, name, emoji")
        .eq("slug", slug)
        .maybeSingle();
      if (cat) {
        setName(cat.name);
        setEmoji(cat.emoji);
        const { data } = await supabase
          .from("shop_products")
          .select("id, name, description, image_url, unit, price, mrp, stock")
          .eq("is_active", true)
          .eq("category_id", cat.id)
          .order("name");
        setProducts(data ?? []);
      }
      setLoading(false);
    })();
  }, [slug]);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 rounded-2xl bg-shop-primary-soft p-4">
        <span className="text-3xl">{emoji ?? "🛍️"}</span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-shop-muted">Category</p>
          <h1 className="font-display text-xl text-shop-fg">{name}</h1>
        </div>
      </header>
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-shop-card" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="py-12 text-center text-sm text-shop-muted">No products in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
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
