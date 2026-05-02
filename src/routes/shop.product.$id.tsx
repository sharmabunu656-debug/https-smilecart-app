import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShopAuth } from "@/lib/shop-auth";
import { useShopUserItems } from "@/lib/shop-user-items";
import { discountPct, type ShopProduct } from "@/components/shop/ProductCard";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/shop/product/$id")({
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useShopAuth();
  const { cart, wishlist, setCartQty, setWishlistFor } = useShopUserItems();
  const [product, setProduct] = React.useState<ShopProduct | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("shop_products")
        .select("id, name, description, image_url, unit, price, mrp, stock")
        .eq("id", id)
        .maybeSingle();
      setProduct(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-shop-card" />;
  if (!product)
    return <p className="py-12 text-center text-sm text-shop-muted">Product not found.</p>;

  const qty = cart[product.id] ?? 0;
  const pct = discountPct(product.mrp, product.price);
  const liked = wishlist.has(product.id);

  const requireAuth = () => {
    if (!user) {
      toast.error("Please sign in first");
      navigate({ to: "/shop/auth" });
      return false;
    }
    return true;
  };

  const setQty = async (next: number) => {
    if (!requireAuth() || !user) return;
    if (next > product.stock) return toast.error("Not enough stock");
    if (next <= 0) {
      await supabase.from("cart_items").delete().match({ user_id: user.id, product_id: product.id });
      setCartQty(product.id, 0);
      return;
    }
    const { error } = await supabase
      .from("cart_items")
      .upsert({ user_id: user.id, product_id: product.id, qty: next }, { onConflict: "user_id,product_id" });
    if (error) toast.error(friendlyError(error, "Could not update your cart."));
    else setCartQty(product.id, next);
  };

  const toggleLike = async () => {
    if (!requireAuth() || !user) return;
    if (liked) {
      await supabase.from("wishlist_items").delete().match({ user_id: user.id, product_id: product.id });
      setWishlistFor(product.id, false);
    } else {
      await supabase.from("wishlist_items").insert({ user_id: user.id, product_id: product.id });
      setWishlistFor(product.id, true);
      toast.success("Saved to wishlist");
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="relative flex h-64 items-center justify-center rounded-3xl bg-shop-primary-soft">
        <span className="text-[120px] animate-pop-in">{product.image_url ?? "🛒"}</span>
        {pct > 0 && (
          <span className="absolute left-4 top-4 rounded-full bg-shop-accent px-3 py-1 text-xs font-bold text-white">
            {pct}% OFF
          </span>
        )}
        <button
          onClick={toggleLike}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-shop transition active:scale-90"
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-shop-danger text-shop-danger" : "text-shop-muted"}`} />
        </button>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-shop-muted">{product.unit}</p>
        <h1 className="mt-1 font-display text-2xl text-shop-fg">{product.name}</h1>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-shop-fg">{formatINR(product.price)}</span>
          {pct > 0 && <span className="text-sm text-shop-muted line-through">{formatINR(product.mrp)}</span>}
          {pct > 0 && <span className="text-xs font-bold text-shop-accent">Save {formatINR(product.mrp - product.price)}</span>}
        </div>
        {product.stock > 0 && product.stock <= 5 && (
          <p className="mt-2 text-xs font-semibold text-shop-danger">Only {product.stock} left!</p>
        )}
        {product.stock <= 0 && <p className="mt-2 text-xs font-semibold text-shop-danger">Out of stock</p>}
      </div>

      {product.description && (
        <div className="rounded-2xl bg-shop-card p-4 shadow-shop">
          <h2 className="text-sm font-bold text-shop-fg">About this product</h2>
          <p className="mt-1.5 text-sm text-shop-muted">{product.description}</p>
        </div>
      )}

      {/* Sticky add bar */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-shop-border bg-shop-bg/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3">
          {qty === 0 ? (
            <button
              onClick={() => setQty(1)}
              disabled={product.stock <= 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-shop-primary py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-40"
            >
              <ShoppingBag className="h-4 w-4" />
              Add to cart
            </button>
          ) : (
            <div className="flex flex-1 items-center justify-between rounded-full bg-shop-primary px-2 py-2 text-white">
              <button
                onClick={() => setQty(qty - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition active:scale-90"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold">{qty} in cart</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition active:scale-90"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            onClick={() => navigate({ to: "/shop/cart" })}
            className="rounded-full border border-shop-primary px-4 py-3 text-xs font-bold uppercase text-shop-primary"
          >
            Cart
          </button>
        </div>
      </div>
    </div>
  );
}
