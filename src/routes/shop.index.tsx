import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ShopProduct } from "@/components/shop/ProductCard";
import { useShopUserItems } from "@/lib/shop-user-items";
import { Search, Sparkles, Truck, Tag, MapPin, Zap } from "lucide-react";

export const Route = createFileRoute("/shop/")({
  component: ShopHome,
});

type Category = { id: string; slug: string; name: string; emoji: string | null };

function ShopHome() {
  const { cart, wishlist, setCartQty, setWishlistFor } = useShopUserItems();

  const categoriesQ = useQuery({
    queryKey: ["shop", "categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name, emoji")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    meta: { persist: true },
    staleTime: 5 * 60_000,
  });

  const featuredQ = useQuery({
    queryKey: ["shop", "products", "featured"],
    queryFn: async (): Promise<ShopProduct[]> => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("id, name, description, image_url, unit, price, mrp, stock")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
    meta: { persist: true },
    staleTime: 60_000,
  });

  const categories = categoriesQ.data ?? [];
  const featured = featuredQ.data ?? [];
  // Show skeletons only on the very first load (no cached data yet).
  const loading = featuredQ.isLoading && !featuredQ.data;

  return (
    <div className="space-y-7 pb-4">
      {/* Hero */}
      <section className="animate-fade-up relative overflow-hidden rounded-[28px] p-5 text-white shadow-shop-lg">
        {/* layered gradient + mesh */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(120% 80% at 0% 0%, oklch(0.78 0.2 45) 0%, transparent 55%), radial-gradient(120% 80% at 100% 100%, oklch(0.5 0.22 18) 0%, transparent 60%), linear-gradient(135deg, var(--shop-primary) 0%, var(--shop-primary-2) 100%)",
          }}
        />
        {/* sheen */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/10" />
        {/* dots */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: "radial-gradient(white 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="relative">
          <span className="shop-chip bg-white/20 text-white backdrop-blur-sm">
            <MapPin className="h-3 w-3" strokeWidth={2.5} /> Delivering to you
          </span>
          <h1 className="mt-3 font-display text-[28px] font-bold leading-[1.05] tracking-tight">
            Fresh groceries.<br />
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-6 w-6 fill-shop-warning text-shop-warning" strokeWidth={1.5} />
              In 15 minutes flat.
            </span>
          </h1>
          <Link
            to="/shop/search"
            className="mt-5 flex items-center gap-2.5 rounded-full bg-white px-4 py-3 text-shop-muted shadow-shop"
          >
            <Search className="h-4 w-4 text-shop-primary" strokeWidth={2.5} />
            <span className="text-[13px] font-medium">Search "apples", "milk", "chips"…</span>
          </Link>
        </div>
      </section>

      {/* Promo strip */}
      <section className="grid grid-cols-3 gap-2.5">
        <PromoTile icon={<Truck className="h-4 w-4" strokeWidth={2.5} />} title="Free delivery" sub="Orders ₹199+" />
        <PromoTile icon={<Tag className="h-4 w-4" strokeWidth={2.5} />} title="Daily deals" sub="Up to 50% off" highlight />
        <PromoTile icon={<Sparkles className="h-4 w-4" strokeWidth={2.5} />} title="Fresh today" sub="Farm direct" />
      </section>

      {/* Categories */}
      <section>
        <SectionHeader title="Shop by category" eyebrow="Browse" />
        <div className="mt-4 grid grid-cols-4 gap-2.5">
          {categories.map((c, i) => (
            <Link
              key={c.id}
              to="/shop/category/$slug"
              params={{ slug: c.slug }}
              className="group flex flex-col items-center gap-1.5 rounded-2xl shop-surface px-2 py-3 transition active:scale-95"
              style={{ animation: `shop-fade-up 380ms ${i * 40}ms cubic-bezier(0.2, 0.7, 0.2, 1) both` }}
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-transform group-active:scale-90"
                style={{
                  backgroundImage:
                    "radial-gradient(120% 80% at 50% 0%, var(--shop-primary-tint) 0%, var(--shop-primary-soft) 100%)",
                }}
              >
                {c.emoji ?? "🛍️"}
              </span>
              <span className="text-[10.5px] font-semibold leading-tight text-shop-fg-soft text-center">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section>
        <SectionHeader title="Today's deals" eyebrow="Hot picks" linkTo="/shop/search" linkLabel="See all" />
        {loading ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 rounded-3xl skeleton" />
            ))}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {featured.map((p, i) => (
              <div
                key={p.id}
                style={{ animation: `shop-fade-up 380ms ${i * 50}ms cubic-bezier(0.2, 0.7, 0.2, 1) both` }}
              >
                <ProductCard
                  product={p}
                  inWishlist={wishlist.has(p.id)}
                  cartQty={cart[p.id] ?? 0}
                  onCartChange={(q) => setCartQty(p.id, q)}
                  onWishlistChange={(on) => setWishlistFor(p.id, on)}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  eyebrow,
  linkTo,
  linkLabel,
}: {
  title: string;
  eyebrow?: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-shop-primary">{eyebrow}</p>
        )}
        <h2 className="font-display text-[22px] font-bold tracking-tight text-shop-fg">{title}</h2>
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="rounded-full bg-shop-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-shop-primary shadow-shop-sm"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

function PromoTile({
  icon,
  title,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-3 ${highlight ? "shadow-shop" : "shadow-shop-sm"}`}
      style={{
        background: highlight
          ? "linear-gradient(135deg, var(--shop-accent-soft) 0%, oklch(0.97 0.05 130) 100%)"
          : "var(--shop-card)",
      }}
    >
      <div
        className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full text-white ${
          highlight ? "bg-shop-grad-accent" : "bg-shop-grad-primary"
        }`}
      >
        {icon}
      </div>
      <p className="text-[11.5px] font-bold leading-tight text-shop-fg">{title}</p>
      <p className="text-[10px] text-shop-muted">{sub}</p>
    </div>
  );
}
