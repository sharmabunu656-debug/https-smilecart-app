import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Search, Heart, ShoppingBag, User, ArrowLeft } from "lucide-react";
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
      <div className="shop-theme min-h-screen bg-shop-bg text-shop-fg pb-24">
        <ShopHeader />
        <main className="mx-auto w-full max-w-xl px-4 pt-4">
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
    <header className="sticky top-0 z-30 border-b border-shop-border bg-shop-bg/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 py-3">
        {!isHome ? (
          <button
            onClick={() => navigate({ to: ".." as never }) || window.history.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-shop-card text-shop-fg shadow-sm transition active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <Link to="/shop" className="flex items-center gap-2">
            <span className="text-2xl">🥕</span>
            <span className="font-display text-lg font-bold text-shop-primary">FreshKart</span>
          </Link>
        )}
        <div className="flex-1" />
        <Link
          to="/shop/wishlist"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-shop-card text-shop-fg shadow-sm transition active:scale-95"
          aria-label="Wishlist"
        >
          <Heart className="h-4 w-4" />
        </Link>
        <Link
          to="/shop/account"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-shop-card text-shop-fg shadow-sm transition active:scale-95"
          aria-label="Account"
        >
          <User className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}

function ShopBottomNav() {
  const cartCount = useShopCartCount();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-shop-border bg-shop-bg">
      <div className="mx-auto flex w-full max-w-xl items-center justify-around px-2 py-2">
        <NavItem to="/shop" icon={<Home className="h-5 w-5" />} label="Home" exact />
        <NavItem to="/shop/search" icon={<Search className="h-5 w-5" />} label="Search" />
        <NavItem to="/shop/cart" icon={<ShoppingBag className="h-5 w-5" />} label="Cart" badge={cartCount} />
        <NavItem to="/shop/orders" icon={<Heart className="h-5 w-5" />} label="Orders" />
        <NavItem to="/shop/account" icon={<User className="h-5 w-5" />} label="Account" />
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
      activeProps={{ className: "text-shop-primary" }}
      className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-shop-muted transition-colors"
    >
      <span className="relative">
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-shop-primary px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

export { useShopAuth };
