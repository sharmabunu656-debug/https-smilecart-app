// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: false,
        // Never run in dev — would interfere with Vite HMR and Lovable preview.
        devOptions: { enabled: false },
        filename: "sw.js",
        manifest: false, // We ship our own /manifest.webmanifest in /public
        workbox: {
          // Don't intercept internal/preview routes.
          navigateFallbackDenylist: [/^\/~/, /^\/api\//, /^\/sw\.js$/, /^\/manifest\.webmanifest$/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false, // we control activation via workbox-window
          runtimeCaching: [
            // HTML navigations: NetworkFirst so a fresh deploy is never trapped behind cache.
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html-pages",
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            // JS/CSS/Workers: StaleWhileRevalidate.
            {
              urlPattern: ({ request }) =>
                request.destination === "script" ||
                request.destination === "style" ||
                request.destination === "worker",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            // Images: CacheFirst, long-lived.
            {
              urlPattern: ({ request }) => request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "images",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Supabase REST reads (GET only): SWR so product/order lists return instantly.
            {
              urlPattern: ({ url, request }) =>
                request.method === "GET" && /\.supabase\.co\/rest\/v1\//.test(url.href),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "supabase-rest",
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
});
