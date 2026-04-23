import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShopAuth } from "@/lib/shop-auth";

/** Hook returning {cartMap, wishlistSet} for the current user, with realtime updates. */
export function useShopUserItems() {
  const { user } = useShopAuth();
  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [wishlist, setWishlist] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!user) {
      setCart({});
      setWishlist(new Set());
      return;
    }
    let active = true;
    const load = async () => {
      const [c, w] = await Promise.all([
        supabase.from("cart_items").select("product_id, qty").eq("user_id", user.id),
        supabase.from("wishlist_items").select("product_id").eq("user_id", user.id),
      ]);
      if (!active) return;
      const m: Record<string, number> = {};
      (c.data ?? []).forEach((r) => (m[r.product_id] = r.qty));
      setCart(m);
      setWishlist(new Set((w.data ?? []).map((r) => r.product_id)));
    };
    load();
    const ch = supabase
      .channel(`user-items-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wishlist_items", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const setCartQty = React.useCallback((id: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }, []);
  const setWishlistFor = React.useCallback((id: string, on: boolean) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  return { cart, wishlist, setCartQty, setWishlistFor };
}
