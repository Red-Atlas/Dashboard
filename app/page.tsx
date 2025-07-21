"use client"

import { useState, useEffect } from "react"
import BusinessOverview from "./components/business-overview"
import AdsPerformance from "./components/ads-performance"
import BrandingSlide from "./components/branding-slide"
import GoogleAnalyticsTest from "./components/ga-test"

const SCREEN_DURATIONS = {
  business: 30000, // 30 seconds
  ads: 30000, // 30 seconds
  branding: 15000, // 15 seconds
}

type Screen = "business" | "ads" | "branding"

export default function Dashboard() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("business")
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const rotateScreen = () => {
      setIsTransitioning(true)

      setTimeout(() => {
        setCurrentScreen((prev) => {
          switch (prev) {
            case "business":
              return "ads"
            case "ads":
              return "branding"
            case "branding":
              return "business"
            default:
              return "business"
          }
        })
        setIsTransitioning(false)
      }, 300) // Fade duration
    }

    const interval = setInterval(rotateScreen, SCREEN_DURATIONS[currentScreen])
    return () => clearInterval(interval)
  }, [currentScreen])

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
    <div className="min-h-screen bg-gray-100 overflow-hidden">
      <div className={`transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
        {renderCurrentScreen()}
      </div>
    </div>
  )
}
