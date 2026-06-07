import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Search, Heart, ShoppingBag, User, ArrowLeft, Package } from "lucide-react";
import { ShopAuthProvider, useShopAuth } from "@/lib/shop-auth";
import { useShopCartCount } from "@/lib/shop-cart";
import * as React from "react";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "FreshKart — Groceries delivered" },
      { name: "description", content: "Order fresh fruits, vegetables, dairy and daily essentials with quick delivery." },
      { property: "og:title", content: "FreshKart — Groceries delivered" },
      { property: "og:description", content: "Fresh groceries, deals and delivery in minutes." },
    ],
  }),
  component: ShopLayout,
});

function ShopLayout() {
  return (
    <ShopAuthProvider>
      <div className="shop-theme min-h-screen text-shop-fg pb-28">
        <ShopHeader />
        <main className="mx-auto w-full max-w-xl px-4 pt-3">
          <Outlet />
        </main>
        <ShopBottomNav />
      </div>
    </ShopAuthProvider>
  );
}

function ShopHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/shop" || location.pathname === "/shop/";

  return (
    <header className="sticky top-0 z-30 shop-glass border-b border-shop-border/60">
      <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 py-3">
        {!isHome ? (
          <button
            onClick={() => navigate({ to: ".." as never }) || window.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-shop-card text-shop-fg shadow-shop-sm transition active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          </button>
        ) : (
          <Link to="/shop" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-shop-grad-primary text-xl shadow-shop-glow">🥕</span>
            <div className="leading-tight">
              <span className="block font-display text-lg font-bold tracking-tight text-shop-fg">FreshKart</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-shop-muted">Fresh in 15 min</span>
            </div>
          </Link>
        )}
        <div className="flex-1" />
        <Link
          to="/shop/wishlist"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-shop-card text-shop-fg shadow-shop-sm transition active:scale-95"
          aria-label="Wishlist"
        >
          <Heart className="h-4 w-4" strokeWidth={2.2} />
        </Link>
        <Link
          to="/shop/account"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-shop-card text-shop-fg shadow-shop-sm transition active:scale-95"
          aria-label="Account"
        >
          <User className="h-4 w-4" strokeWidth={2.2} />
        </Link>
      </div>
    </header>
  );
}

function ShopBottomNav() {
  const cartCount = useShopCartCount();
  return (
    <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2">
      <div className="shop-glass flex items-center justify-around rounded-full px-2 py-2 shadow-shop-lg">
        <NavItem to="/shop" icon={<Home className="h-5 w-5" strokeWidth={2.2} />} label="Home" exact />
        <NavItem to="/shop/search" icon={<Search className="h-5 w-5" strokeWidth={2.2} />} label="Search" />
        <NavItem to="/shop/cart" icon={<ShoppingBag className="h-5 w-5" strokeWidth={2.2} />} label="Cart" badge={cartCount} />
        <NavItem to="/shop/orders" icon={<Package className="h-5 w-5" strokeWidth={2.2} />} label="Orders" />
        <NavItem to="/shop/account" icon={<User className="h-5 w-5" strokeWidth={2.2} />} label="Account" />
      </div>
    </nav>
  );
}

function NavItem({
  to,
  icon,
  label,
  badge,
  exact,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      activeProps={{ className: "!text-white [&>span:first-child]:bg-shop-grad-primary [&>span:first-child]:shadow-shop-glow" }}
      className="group relative flex min-w-0 flex-col items-center gap-0.5 rounded-full px-2.5 py-1 text-shop-muted transition-colors"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full transition-all">
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-shop-grad-primary px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="text-[9.5px] font-semibold tracking-wide">{label}</span>
    </Link>
  );
}

export { useShopAuth };
