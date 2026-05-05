/**
 * Treat a request as the "shop" app when the hostname starts with `shop.`
 * (e.g. shop.yourdomain.com) or contains `-shop` (preview/staging hosts).
 * Customize the list below if you connect a different subdomain.
 */
export function isShopHost(hostname: string | undefined | null): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return h.startsWith("shop.") || h.includes("-shop.") || h === "shop.localhost";
}

export function useIsShopHost(): boolean {
  if (typeof window === "undefined") return false;
  return isShopHost(window.location.hostname);
}
