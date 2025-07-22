"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import BusinessOverview from "./components/business-overview"
import AdsPerformance from "./components/ads-performance"
import BrandingSlide from "./components/branding-slide"
import GoogleAnalyticsTest from "./components/ga-test"

const SCREEN_DURATIONS = {
  business: 15000, // 15 seconds
  ads: 15000, // 15 seconds
  branding: 5000, // 5 seconds
}

type Screen = "business" | "ads" | "branding"

export default function Dashboard() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("business")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const getNextScreen = (current: Screen): Screen => {
    switch (current) {
      case "business":
        return "ads"
      case "ads":
        return "branding"
      case "branding":
        return "business"
      default:
        return "business"
    }
  }

  const getPreviousScreen = (current: Screen): Screen => {
    switch (current) {
      case "business":
        return "branding"
      case "ads":
        return "business"
      case "branding":
        return "ads"
      default:
        return "business"
    }
  }

  const navigateToScreen = (nextScreen: Screen) => {
    if (isTransitioning) return // Prevent multiple transitions

    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentScreen(nextScreen)
      setIsTransitioning(false)
    }, 300) // Fade duration
  }

  const handleNext = () => {
    const nextScreen = getNextScreen(currentScreen)
    navigateToScreen(nextScreen)
  }

  const handlePrevious = () => {
    const prevScreen = getPreviousScreen(currentScreen)
    navigateToScreen(prevScreen)
  }

  // Auto-rotation effect
  useEffect(() => {
    const rotateScreen = () => {
      if (!isTransitioning) {
        const nextScreen = getNextScreen(currentScreen)
        navigateToScreen(nextScreen)
      }
    }

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Set new interval
    intervalRef.current = setInterval(rotateScreen, SCREEN_DURATIONS[currentScreen])

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [currentScreen, isTransitioning])

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case "business":
        return <BusinessOverview />
      case "ads":
        return <AdsPerformance />
      case "branding":
        return <BrandingSlide />
      default:
        return <BusinessOverview />
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 overflow-hidden relative">
      {/* Left Arrow */}
      <button
        onClick={handlePrevious}
        disabled={isTransitioning}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow-lg rounded-full p-3 transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous screen"
      >
        <ChevronLeft className="w-6 h-6 text-gray-700" />
      </button>

      {/* Right Arrow */}
      <button
        onClick={handleNext}
        disabled={isTransitioning}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow-lg rounded-full p-3 transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next screen"
      >
        <ChevronRight className="w-6 h-6 text-gray-700" />
      </button>

      {/* Screen Content */}
      <div className={`transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
        {renderCurrentScreen()}
      </div>

      {/* Screen Indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
        {(["business", "ads", "branding"] as Screen[]).map((screen) => (
          <button
            key={screen}
            onClick={() => navigateToScreen(screen)}
            disabled={isTransitioning}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              currentScreen === screen
                ? "bg-white shadow-lg"
                : "bg-white/50 hover:bg-white/70"
            }`}
            aria-label={`Go to ${screen} screen`}
          />
        ))}
      </div>
    </div>
  )
}
