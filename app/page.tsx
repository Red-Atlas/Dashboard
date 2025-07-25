"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [currentScreen, setCurrentScreen] = useState<Screen>("business")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Authentication state only persists while page is loaded (no session storage)
  // When page reloads, user needs to authenticate again

  // Auto-rotation effect - MUST be here before any early returns
  useEffect(() => {
    if (!isAuthenticated) return // Don't run if not authenticated

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
  }, [currentScreen, isTransitioning, isAuthenticated])

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Simple password check - in production, use proper auth
    if (password === process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD) {
      setIsAuthenticated(true)
      setError("")
      // No sessionStorage - authentication only lasts until page reload
    } else {
      setError("Contraseña incorrecta")
      setPassword("")
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    // No need to clear sessionStorage since we don't use it anymore
  }

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

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
          <div className="text-center mb-8">
            {/* RED Atlas Logo */}
            <div className="mb-6">
              <Image 
                src="/red-atlas-logo.png" 
                alt="RED Atlas Logo" 
                width={200} 
                height={60} 
                className="h-16 w-auto mx-auto" 
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Empresarial</h1>
            <p className="text-gray-600 mt-2">Ingresa la contraseña para acceder</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all duration-200 hover:border-gray-400"
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Acceder al Dashboard
            </button>
          </form>
          
          <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
            <div className="flex items-center justify-center space-x-2">
              <span>🔒</span>
              <span>Datos confidenciales - Solo personal autorizado</span>
            </div>
          </div>
        </div>
      </div>
    )
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
