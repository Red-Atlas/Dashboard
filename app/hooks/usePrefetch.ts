import { useEffect, useRef } from "react";
import { apiCache } from "@/app/utils/apiCache";
import { CACHE_CONFIG, CACHE_DURATION_MS } from "@/app/config/cache";

/**
 * Warms the client cache for the next screen while the current one is showing.
 *
 * These calls previously used bare `fetch`, which meant they populated nothing:
 * the API responses are `no-store`, so the browser couldn't reuse them and the
 * next screen refetched everything anyway. Going through `apiCache` is what
 * actually makes the prefetch pay off.
 */

const SCREEN_ENDPOINTS: Record<number, string[]> = {
  // BusinessOverview. Transactions are intentionally absent: that panel is
  // paginated and always wants a fresh first page.
  0: [
    "/api/metrics/active-users-30min",
    "/api/metrics/registered-users",
    "/api/metrics/page-views-today",
    "/api/metrics/page-views-by-hour",
    "/api/metrics/stripe-revenue",
    "/api/metrics/stripe-subscriptions",
  ],
  1: [
    "/api/metrics/ctr-week",
    "/api/metrics/roas-week",
    "/api/metrics/ctr-daily-7days",
  ],
  2: ["/api/metrics/registered-users", "/api/metrics/paid-users-month"],
  3: [
    "/api/metrics/active-users-7days",
    "/api/metrics/registered-users-history",
    "/api/metrics/device-breakdown",
    "/api/metrics/geographic-breakdown",
  ],
  // 4 is the static branding slide — nothing to fetch.
  5: ["/api/atlas-data"],
};

/** Realtime endpoints get a shorter TTL than the rest. */
function ttlFor(url: string): number {
  return url.includes("30min") ? CACHE_CONFIG.REALTIME * 1000 : CACHE_DURATION_MS;
}

export function usePrefetch(
  currentScreen: number,
  enabledScreens: number[],
  prefetchDelay: number = 15000,
  isEnabled: boolean = true
) {
  // Remembers what we've already warmed so we don't refetch on every render.
  const prefetchedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!isEnabled) return;

    const currentIndex = enabledScreens.indexOf(currentScreen);
    if (currentIndex === -1) return;

    const nextScreen =
      enabledScreens[(currentIndex + 1) % enabledScreens.length];

    if (prefetchedRef.current.has(nextScreen)) return;

    const endpoints = SCREEN_ENDPOINTS[nextScreen];
    if (!endpoints?.length) return;

    const timer = setTimeout(() => {
      prefetchedRef.current.add(nextScreen);

      // Keep the set small so a long-running kiosk re-warms periodically.
      if (prefetchedRef.current.size > 2) {
        prefetchedRef.current = new Set(
          Array.from(prefetchedRef.current).slice(-2)
        );
      }

      Promise.allSettled(
        endpoints.map((url) => apiCache.fetch(url, ttlFor(url)))
      ).catch(() => {
        // Prefetch is best-effort; the screen will fetch on mount regardless.
      });
    }, prefetchDelay);

    return () => clearTimeout(timer);
  }, [currentScreen, enabledScreens, prefetchDelay, isEnabled]);
}
