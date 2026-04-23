import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ShopProduct } from "@/components/shop/ProductCard";
import { useShopUserItems } from "@/lib/shop-user-items";
import { Search, Sparkles, Truck, Tag } from "lucide-react";

export const Route = createFileRoute("/shop/")({
  component: ShopHome,
});

type Category = { id: string; slug: string; name: string; emoji: string | null };

function ShopHome() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [featured, setFeatured] = React.useState<ShopProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { cart, wishlist, setCartQty, setWishlistFor } = useShopUserItems();

  React.useEffect(() => {
    Promise.all([
      supabase.from("categories").select("id, slug, name, emoji").order("sort_order"),
      supabase
        .from("shop_products")
        .select("id, name, description, image_url, unit, price, mrp, stock")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(8),
    ]).then(([c, p]) => {
      setCategories(c.data ?? []);
      setFeatured(p.data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6 pb-4">
      {/* Hero greeting */}
      <section className="animate-fade-up rounded-3xl bg-gradient-to-br from-shop-primary to-[oklch(0.55_0.2_15)] p-5 text-white shadow-shop">
        <p className="text-xs font-medium uppercase tracking-wider opacity-90">Delivering to you</p>
        <h1 className="mt-1 font-display text-2xl leading-tight">
          Fresh groceries in <span className="underline decoration-white/40">15 mins</span>
        </h1>
        <Link
          to="/shop/search"
          className="mt-4 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-shop-muted shadow-sm"
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Search apples, milk, chips…</span>
        </Link>
      </section>

      {/* Promo strip */}
      <section className="grid grid-cols-3 gap-2 text-center">
        <PromoTile icon={<Truck className="h-4 w-4" />} title="Free delivery" sub="Orders over ₹199" />
        <PromoTile icon={<Tag className="h-4 w-4" />} title="Daily deals" sub="Up to 50% off" />
        <PromoTile icon={<Sparkles className="h-4 w-4" />} title="Fresh today" sub="Farm direct" />
      </section>

      {/* Categories */}
      <section>
        <SectionHeader title="Shop by category" />
        <div className="mt-3 grid grid-cols-3 gap-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/shop/category/$slug"
              params={{ slug: c.slug }}
              className="flex flex-col items-center gap-2 rounded-2xl bg-shop-card p-3 shadow-shop transition active:scale-95"
            >
              <span className="text-3xl">{c.emoji ?? "🛍️"}</span>
              <span className="text-xs font-semibold text-shop-fg">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section>
        <SectionHeader title="Today's deals" linkTo="/shop/search" linkLabel="See all" />
        {loading ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-shop-card" />
            ))}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {featured.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                inWishlist={wishlist.has(p.id)}
                cartQty={cart[p.id] ?? 0}
                onCartChange={(q) => setCartQty(p.id, q)}
                onWishlistChange={(on) => setWishlistFor(p.id, on)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ title, linkTo, linkLabel }: { title: string; linkTo?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="font-display text-lg text-shop-fg">{title}</h2>
      {linkTo && (
        <Link to={linkTo} className="text-xs font-semibold text-shop-primary">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

function PromoTile({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-shop-accent-soft p-3">
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-shop-accent text-white">
        {icon}
      </div>
      <p className="text-[11px] font-bold text-shop-fg">{title}</p>
      <p className="text-[10px] text-shop-muted">{sub}</p>
    </div>
  );
}
