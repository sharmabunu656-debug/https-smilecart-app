import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShopAuth } from "@/lib/shop-auth";

/**
 * Lightweight cart count hook.
 * Subscribes to realtime changes in cart_items for the current user.
 */
export function useShopCartCount() {
  const { user } = useShopAuth();
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("cart_items")
        .select("qty")
        .eq("user_id", user.id);
      if (!active) return;
      setCount((data ?? []).reduce((s, r) => s + (r.qty ?? 0), 0));
    };
    load();

    const channel = supabase
      .channel(`cart-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}
