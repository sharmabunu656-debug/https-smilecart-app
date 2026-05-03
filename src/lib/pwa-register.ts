/**
 * Registers the service worker only in safe contexts:
 * - Production builds only (skipped in dev)
 * - Skipped inside iframes (Lovable preview)
 * - Skipped on Lovable preview domains
 *
 * In unsafe contexts, any previously registered SW is unregistered and its caches purged
 * so the editor preview never serves stale content.
 */
export function registerPwa() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host === "localhost" ||
    host === "127.0.0.1";

  const isProd = import.meta.env.PROD;

  if (!isProd || isInIframe || isPreviewHost) {
    // Clean up any previously registered SW + caches in unsafe contexts.
    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        // ignore
      }
    })();
    return;
  }

  // Lazy-load workbox-window only when we will actually register.
  void import("workbox-window").then(({ Workbox }) => {
    const wb = new Workbox("/sw.js");
    wb.addEventListener("waiting", () => {
      // A new SW is ready — activate immediately so users get fresh code on next nav.
      wb.messageSkipWaiting();
    });
    wb.addEventListener("controlling", () => {
      window.location.reload();
    });
    wb.register().catch(() => {
      // ignore registration errors
    });
  });
}
