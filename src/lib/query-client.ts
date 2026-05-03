import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

const ONE_HOUR = 1000 * 60 * 60;
const ONE_DAY = ONE_HOUR * 24;

let cachedClient: QueryClient | null = null;

/**
 * Returns a singleton QueryClient on the client (browser) and a fresh client on the server.
 * In the browser, queries are persisted to localStorage so product lists, categories, orders,
 * and wishlist load instantly on flaky mobile networks while a fresh fetch happens in the background.
 */
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Always a fresh client on the server to avoid leaking data across requests.
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          gcTime: ONE_DAY,
          retry: 1,
        },
      },
    });
  }

  if (cachedClient) return cachedClient;

  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: ONE_DAY,
        // Retry transient errors a few times — helpful on flaky networks.
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
        // Use cached data immediately, refetch in background (SWR).
        networkMode: "offlineFirst",
      },
      mutations: {
        retry: 0,
        networkMode: "online",
      },
    },
  });

  try {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: "shop-query-cache-v1",
      throttleTime: 1000,
    });

    persistQueryClient({
      queryClient: client,
      persister,
      maxAge: ONE_DAY * 7,
      // Bump this when query shapes change to invalidate old caches.
      buster: "v1",
      dehydrateOptions: {
        // Only persist queries explicitly marked as cache-friendly via meta.persist === true.
        shouldDehydrateQuery: (q) => q.state.status === "success" && q.meta?.persist === true,
      },
    });
  } catch {
    // localStorage may be unavailable (private mode, quota). Fall back to memory cache.
  }

  cachedClient = client;
  return client;
}
