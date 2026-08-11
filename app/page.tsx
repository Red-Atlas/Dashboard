"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefetch } from "./hooks/usePrefetch";
import { ScreenSkeleton } from "./components/skeletons";

/**
 * Each screen is code-split. Only the visible one is downloaded, which keeps
 * the heavy chart bundle out of the initial load — previously all six screens
 * (and Recharts) shipped up front even though only one is ever on screen.
 */
const BusinessOverview = dynamic(() => import("./components/business-overview"), {
  loading: () => <ScreenSkeleton />,
});
const AdsPerformance = dynamic(() => import("./components/ads-performance"), {
  loading: () => <ScreenSkeleton />,
});
const GoalsScreen = dynamic(() => import("./components/goals-screen"), {
  loading: () => <ScreenSkeleton />,
});
const AnalyticsCharts = dynamic(() => import("./components/analytics-charts"), {
  loading: () => <ScreenSkeleton />,
});
const BrandingSlide = dynamic(() => import("./components/branding-slide"));
const RedAtlasDB = dynamic(() => import("./components/RedAtlasDB"), {
  loading: () => <ScreenSkeleton title="Datos de la Base de Datos" />,
});

const SCREEN_DURATION_MS = 30_000;

/** How long to hold the carousel after someone interacts with a screen. */
const INTERACTION_PAUSE_MS = 120_000;

const SCREEN_COUNT = 6;

export default function Home() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const screenIndexes = useMemo(
    () => Array.from({ length: SCREEN_COUNT }, (_, index) => index),
    []
  );

  usePrefetch(currentScreen, screenIndexes, 15000, true);

  /**
   * Searching or paging through transactions on a screen that rotates away
   * every 30s is useless, so any interaction holds the carousel for a while.
   */
  const handleInteraction = useCallback(() => {
    setIsPaused(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(
      () => setIsPaused(false),
      INTERACTION_PAUSE_MS
    );
  }, []);

  useEffect(
    () => () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!autoPlay || isPaused) return;

    const interval = setInterval(() => {
      setCurrentScreen((previous) => (previous + 1) % SCREEN_COUNT);
    }, SCREEN_DURATION_MS);

    return () => clearInterval(interval);
  }, [autoPlay, isPaused]);

  const goToPrevious = () => {
    handleInteraction();
    setCurrentScreen((previous) => (previous - 1 + SCREEN_COUNT) % SCREEN_COUNT);
  };

  const goToNext = () => {
    handleInteraction();
    setCurrentScreen((previous) => (previous + 1) % SCREEN_COUNT);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const screens = [
    <BusinessOverview key="business" onInteraction={handleInteraction} />,
    <AdsPerformance key="ads" />,
    <GoalsScreen key="goals" />,
    <AnalyticsCharts key="charts" />,
    <BrandingSlide key="branding" />,
    <RedAtlasDB key="redAtlasDB" />,
  ];

  return (
    <main className="min-h-screen bg-gray-50 relative">
      <div className="relative">{screens[currentScreen]}</div>

      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
        >
          Cerrar Sesión
        </Button>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevious}
          aria-label="Pantalla anterior"
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex gap-1">
          {screenIndexes.map((screenIndex) => (
            <button
              key={screenIndex}
              type="button"
              onClick={() => {
                handleInteraction();
                setCurrentScreen(screenIndex);
              }}
              aria-label={`Ir a la pantalla ${screenIndex + 1}`}
              aria-current={currentScreen === screenIndex}
              className={`w-2 h-2 rounded-full transition-colors ${
                currentScreen === screenIndex ? "bg-blue-600" : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNext}
          aria-label="Pantalla siguiente"
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        <Button
          variant={autoPlay && !isPaused ? "default" : "outline"}
          size="sm"
          onClick={() => {
            if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
            setIsPaused(false);
            setAutoPlay((previous) => !previous);
          }}
          className="ml-2 text-xs"
        >
          {!autoPlay ? "Auto" : isPaused ? "En pausa" : "Pausar"}
        </Button>
      </div>
    </main>
  );
}
