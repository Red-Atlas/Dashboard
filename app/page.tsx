"use client"

import { useState, useEffect } from "react"
import BusinessOverview from "./components/business-overview"
import AdsPerformance from "./components/ads-performance"
import BrandingSlide from "./components/branding-slide"
import GoalsScreen from "./components/goals-screen"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState(3) // Start with goals screen (index 3)
  const [autoPlay, setAutoPlay] = useState(false) // Disable auto-play by default
  
  const screens = [
    <BusinessOverview key="business" />,
    <AdsPerformance key="ads" />,
    <BrandingSlide key="branding" />,
    <GoalsScreen key="goals" />
  ]

  // For now, only show goals screen
  const enabledScreens = [3] // Only goals screen
  const currentEnabledScreen = enabledScreens[0]

  useEffect(() => {
    if (!autoPlay) return

    const interval = setInterval(() => {
      setCurrentScreen((prev) => {
        const currentIndex = enabledScreens.indexOf(prev)
        const nextIndex = (currentIndex + 1) % enabledScreens.length
        return enabledScreens[nextIndex]
      })
    }, 30000) // 30 seconds per screen

    return () => clearInterval(interval)
  }, [autoPlay, enabledScreens])

  const goToPrevious = () => {
    if (enabledScreens.length > 1) {
      const currentIndex = enabledScreens.indexOf(currentScreen)
      const prevIndex = currentIndex === 0 ? enabledScreens.length - 1 : currentIndex - 1
      setCurrentScreen(enabledScreens[prevIndex])
    }
  }

  const goToNext = () => {
    if (enabledScreens.length > 1) {
      const currentIndex = enabledScreens.indexOf(currentScreen)
      const nextIndex = (currentIndex + 1) % enabledScreens.length
      setCurrentScreen(enabledScreens[nextIndex])
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 relative">
      {/* Main content */}
      <div className="relative">
        {screens[currentScreen]}
      </div>

      {/* Navigation controls - only show if multiple screens are enabled */}
      {enabledScreens.length > 1 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevious}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex gap-1">
            {enabledScreens.map((screenIndex, index) => (
              <div
                key={screenIndex}
                className={`w-2 h-2 rounded-full transition-colors ${
                  currentScreen === screenIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNext}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          
          <Button
            variant={autoPlay ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoPlay(!autoPlay)}
            className="ml-2 text-xs"
          >
            {autoPlay ? "Pausar" : "Auto"}
          </Button>
        </div>
      )}

      {/* Screen indicator */}
      <div className="fixed top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 shadow-lg border text-sm">
        Pantalla: {currentScreen + 1} de {screens.length}
      </div>
    </main>
  )
}
