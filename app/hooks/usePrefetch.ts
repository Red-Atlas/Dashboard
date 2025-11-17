import { useEffect, useRef } from "react";

/**
 * Hook para fazer prefetch de dados antes de precisar deles
 * Isso melhora a performance ao carregar dados da próxima tela antecipadamente
 */
export function usePrefetch(
  currentScreen: number,
  enabledScreens: number[],
  prefetchDelay: number = 15000, // 15 segundos antes de mudar de tela
  isEnabled: boolean = true
) {
  const prefetchedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Se o prefetch estiver desabilitado (ex: usuário não autenticado), não fazer nada
    if (!isEnabled) {
      return;
    }

    // Determinar qual é a próxima tela
    const currentIndex = enabledScreens.indexOf(currentScreen);
    const nextIndex = (currentIndex + 1) % enabledScreens.length;
    const nextScreen = enabledScreens[nextIndex];

    // Se já fizemos prefetch desta tela, não fazer novamente
    if (prefetchedRef.current.has(nextScreen)) {
      return;
    }

    // Aguardar um tempo antes de fazer o prefetch
    const timer = setTimeout(() => {
      console.log(`🚀 Prefetching data for screen ${nextScreen}`);

      // Fazer prefetch baseado na tela
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

  // Reset prefetch cache quando mudar de tela
  useEffect(() => {
    // Manter apenas as últimas 2 telas em cache
    if (prefetchedRef.current.size > 2) {
      const array = Array.from(prefetchedRef.current);
      prefetchedRef.current = new Set(array.slice(-2));
    }
  }, [currentScreen, isEnabled]);
}

// Funções de prefetch para cada tela
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
