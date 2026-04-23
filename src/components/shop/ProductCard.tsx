import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShopAuth } from "@/lib/shop-auth";
import { formatINR } from "@/lib/currency";
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
    if (error) toast.error(error.message);
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
    if (error) toast.error(error.message);
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
    <div className="relative overflow-hidden rounded-2xl bg-shop-card shadow-shop">
      <Link
        to="/shop/product/$id"
        params={{ id: product.id }}
        className="block"
      >
        <div className="relative flex h-28 items-center justify-center bg-shop-primary-soft">
          <span className="text-5xl">{product.image_url ?? "🛒"}</span>
          {pct > 0 && (
            <span className="absolute left-2 top-2 rounded-full bg-shop-accent px-2 py-0.5 text-[10px] font-bold text-white">
              {pct}% OFF
            </span>
          )}
          <button
            onClick={toggleWishlist}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm transition active:scale-90"
            aria-label="Wishlist"
          >
            <Heart
              className={`h-3.5 w-3.5 ${inWishlist ? "fill-shop-danger text-shop-danger" : "text-shop-muted"}`}
            />
          </button>
        </div>
        <div className="p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-shop-muted">
            {product.unit}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-tight text-shop-fg">
            {product.name}
          </h3>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-shop-fg">{formatINR(product.price)}</span>
            {pct > 0 && (
              <span className="text-xs text-shop-muted line-through">{formatINR(product.mrp)}</span>
            )}
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3">
        {cartQty === 0 ? (
          <button
            onClick={addToCart}
            disabled={product.stock <= 0}
            className="w-full rounded-full border border-shop-primary py-1.5 text-xs font-bold uppercase tracking-wide text-shop-primary transition active:scale-95 disabled:opacity-40"
          >
            {product.stock <= 0 ? "Out of stock" : "Add"}
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-full bg-shop-primary px-1 py-1 text-white">
            <button
              onClick={() => setQty(cartQty - 1)}
              className="flex h-6 w-6 items-center justify-center rounded-full transition active:scale-90"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-bold">{cartQty}</span>
            <button
              onClick={() => setQty(cartQty + 1)}
              className="flex h-6 w-6 items-center justify-center rounded-full transition active:scale-90"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
