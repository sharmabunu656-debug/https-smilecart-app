import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Profile = { full_name: string | null; phone: string | null };

type Ctx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = React.createContext<Ctx | undefined>(undefined);

export function ShopAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const loadProfileAndRole = React.useCallback(async (uid: string) => {
    const [profRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("full_name, phone").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
    ]);
    setProfile(profRes.data ?? { full_name: null, phone: null });
    setIsAdmin(!!roleRes.data);
  }, []);

  React.useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer to avoid recursion
        setTimeout(() => loadProfileAndRole(sess.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });
    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadProfileAndRole(sess.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfileAndRole]);

  const refreshProfile = React.useCallback(async () => {
    if (user) await loadProfileAndRole(user.id);
  }, [user, loadProfileAndRole]);

  const queryClient = useQueryClient();
  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    try {
      window.localStorage.removeItem("shop-query-cache-v1");
    } catch {
      // localStorage may be unavailable
    }
  }, [queryClient]);

  const value = React.useMemo(
    () => ({ user, session, profile, isAdmin, loading, refreshProfile, signOut }),
    [user, session, profile, isAdmin, loading, refreshProfile, signOut],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useShopAuth() {
  const ctx = React.useContext(AuthCtx);
  if (!ctx) throw new Error("useShopAuth must be used within ShopAuthProvider");
  return ctx;
}
