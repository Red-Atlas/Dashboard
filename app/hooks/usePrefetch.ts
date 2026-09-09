import { useEffect, useRef } from "react";

/**
 * Hook to prefetch data before it is needed
 * This improves performance by loading the next screen's data ahead of time
 */
export function usePrefetch(
  currentScreen: number,
  enabledScreens: number[],
  prefetchDelay: number = 15000, // 15 seconds before switching screens
  isEnabled: boolean = true
) {
  const prefetchedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // If prefetching is disabled (e.g. unauthenticated user), do nothing
    if (!isEnabled) {
      return;
    }

    // Determine which screen is next
    const currentIndex = enabledScreens.indexOf(currentScreen);
    const nextIndex = (currentIndex + 1) % enabledScreens.length;
    const nextScreen = enabledScreens[nextIndex];

    // If we already prefetched this screen, don't do it again
    if (prefetchedRef.current.has(nextScreen)) {
      return;
    }

    // Wait a while before prefetching
    const timer = setTimeout(() => {
      console.log(`🚀 Prefetching data for screen ${nextScreen}`);

      // Prefetch based on the screen
      switch (nextScreen) {
        case 0: // BusinessOverview
          prefetchBusinessData();
          break;
        case 1: // AdsPerformance
          prefetchAdsData();
          break;
        case 2: // GoalsScreen
          prefetchGoalsData();
          break;
        case 3: // AnalyticsCharts
          prefetchAnalyticsData();
          break;
        case 5: // RedAtlasDB
          prefetchRedAtlasData();
          break;
      }

      prefetchedRef.current.add(nextScreen);
    }, prefetchDelay);

    return () => clearTimeout(timer);
  }, [currentScreen, enabledScreens, prefetchDelay, isEnabled]);

  // Reset the prefetch cache when the screen changes
  useEffect(() => {
    // Keep only the last 2 screens in the cache
    if (prefetchedRef.current.size > 2) {
      const array = Array.from(prefetchedRef.current);
      prefetchedRef.current = new Set(array.slice(-2));
    }
  }, [currentScreen, isEnabled]);
}

// Prefetch functions for each screen
async function prefetchBusinessData() {
  try {
    await Promise.all([
      fetch("/api/metrics/active-users-30min"),
      fetch("/api/metrics/registered-users"),
      fetch("/api/metrics/page-views-today"),
      fetch("/api/metrics/page-views-by-hour"),
      fetch("/api/metrics/stripe-transactions"),
      fetch("/api/metrics/stripe-revenue"),
      fetch("/api/metrics/stripe-subscriptions"),
    ]);
    console.log("✅ Business data prefetched");
  } catch (error) {
    console.error("❌ Error prefetching business data:", error);
  }
}

async function prefetchAdsData() {
  try {
    await Promise.all([
      fetch("/api/metrics/ctr-week"),
      fetch("/api/metrics/roas-week"),
      fetch("/api/metrics/ctr-daily-7days"),
    ]);
    console.log("✅ Ads data prefetched");
  } catch (error) {
    console.error("❌ Error prefetching ads data:", error);
  }
}

async function prefetchGoalsData() {
  try {
    await Promise.all([
      fetch("/api/metrics/registered-users"),
      fetch("/api/metrics/paid-users-month"),
    ]);
    console.log("✅ Goals data prefetched");
  } catch (error) {
    console.error("❌ Error prefetching goals data:", error);
  }
}

async function prefetchAnalyticsData() {
  try {
    await Promise.all([
      fetch("/api/metrics/active-users-7days"),
      fetch("/api/metrics/registered-users-history"),
      fetch("/api/metrics/device-breakdown"),
      fetch("/api/metrics/geographic-breakdown"),
    ]);
    console.log("✅ Analytics data prefetched");
  } catch (error) {
    console.error("❌ Error prefetching analytics data:", error);
  }
}

async function prefetchRedAtlasData() {
  try {
    await fetch("/api/atlas-data");
    console.log("✅ RedAtlas data prefetched");
  } catch (error) {
    console.error("❌ Error prefetching RedAtlas data:", error);
  }
}
