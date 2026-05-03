import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShopAuth } from "@/lib/shop-auth";
import { formatINR } from "@/lib/currency";
import { friendlyError } from "@/lib/friendly-error";
import { toast } from "sonner";

export type ShopProduct = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  unit: string;
  price: number;
  mrp: number;
  stock: number;
};

export function discountPct(mrp: number, price: number) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

export function ProductCard({
  product,
  inWishlist,
  cartQty,
  onCartChange,
  onWishlistChange,
}: {
  product: ShopProduct;
  inWishlist: boolean;
  cartQty: number;
  onCartChange: (qty: number) => void;
  onWishlistChange: (inWishlist: boolean) => void;
}) {
  const { user } = useShopAuth();
  const pct = discountPct(product.mrp, product.price);

  const requireAuth = () => {
    if (!user) {
      toast.error("Please sign in", { description: "Sign in to add items to your cart." });
      return false;
    }
    return true;
  };

  const addToCart = async () => {
    if (!requireAuth() || !user) return;
    if (product.stock <= 0) {
      toast.error("Out of stock");
      return;
    }
    const { error } = await supabase
      .from("cart_items")
      .upsert(
        { user_id: user.id, product_id: product.id, qty: 1 },
        { onConflict: "user_id,product_id" },
      );
    if (error) toast.error(friendlyError(error, "Could not add to cart."));
    else {
      onCartChange(1);
      toast.success("Added to cart");
    }
  };

  const setQty = async (next: number) => {
    if (!user) return;
    if (next <= 0) {
      await supabase.from("cart_items").delete().match({ user_id: user.id, product_id: product.id });
      onCartChange(0);
      return;
    }
    if (next > product.stock) {
      toast.error("Not enough stock");
      return;
    }
    const { error } = await supabase
      .from("cart_items")
      .upsert(
        { user_id: user.id, product_id: product.id, qty: next },
        { onConflict: "user_id,product_id" },
      );
    if (error) toast.error(friendlyError(error, "Could not update your cart."));
    else onCartChange(next);
  };

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!requireAuth() || !user) return;
    if (inWishlist) {
      await supabase
        .from("wishlist_items")
        .delete()
        .match({ user_id: user.id, product_id: product.id });
      onWishlistChange(false);
    } else {
      await supabase
        .from("wishlist_items")
        .insert({ user_id: user.id, product_id: product.id });
      onWishlistChange(true);
      toast.success("Saved to wishlist");
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl shop-surface transition-transform duration-200 active:scale-[0.985]">
      <Link
        to="/shop/product/$id"
        params={{ id: product.id }}
        className="block"
      >
        <div
          className="relative flex h-32 items-center justify-center overflow-hidden"
          style={{
            backgroundImage:
              "radial-gradient(120% 80% at 50% 0%, var(--shop-primary-tint) 0%, var(--shop-primary-soft) 60%, var(--shop-card-2) 100%)",
          }}
        >
          {/* soft grain dots */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(oklch(1 0 0 / 0.6) 1px, transparent 1px)",
              backgroundSize: "10px 10px",
            }}
          />
          <span className="relative text-[3.25rem] drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
            {product.image_url ?? "🛒"}
          </span>
          {pct > 0 && (
            <span className="shop-chip absolute left-2.5 top-2.5 bg-shop-grad-accent text-white shadow-shop-sm">
              −{pct}%
            </span>
          )}
          <button
            onClick={toggleWishlist}
            className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-shop-sm transition active:scale-90"
            aria-label="Wishlist"
          >
            <Heart
              className={`h-3.5 w-3.5 transition-colors ${inWishlist ? "fill-shop-danger text-shop-danger" : "text-shop-muted"}`}
              strokeWidth={2.2}
            />
          </button>
          {product.stock > 0 && product.stock <= 5 && (
            <span className="shop-chip absolute bottom-2.5 left-2.5 bg-white/90 text-shop-danger shadow-shop-sm">
              Only {product.stock} left
            </span>
          )}
        </div>
        <div className="px-3.5 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-shop-faint">
            {product.unit}
          </p>
          <h3 className="mt-1 line-clamp-2 text-[13.5px] font-semibold leading-snug text-shop-fg">
            {product.name}
          </h3>
          <div className="mt-2 flex items-baseline gap-1.5 font-mono-num">
            <span className="font-display text-[17px] font-bold tracking-tight text-shop-fg">
              {formatINR(product.price)}
            </span>
            {pct > 0 && (
              <span className="text-[11px] text-shop-faint line-through">{formatINR(product.mrp)}</span>
            )}
          </div>
        </div>
      </Link>
      <div className="px-3.5 pb-3.5 pt-2.5">
        {cartQty === 0 ? (
          <button
            onClick={addToCart}
            disabled={product.stock <= 0}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-shop-primary-soft py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-shop-primary transition hover:bg-shop-primary-tint active:scale-95 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            {product.stock <= 0 ? "Out of stock" : "Add"}
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-full bg-shop-grad-primary px-1 py-1 text-white shadow-shop-glow">
            <button
              onClick={() => setQty(cartQty - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition active:scale-90"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
            <span className="font-mono-num text-xs font-bold">{cartQty}</span>
            <button
              onClick={() => setQty(cartQty + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition active:scale-90"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
