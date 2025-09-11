"use client"

import { useState, useEffect } from "react"
import BusinessOverview from "./components/business-overview"
import AdsPerformance from "./components/ads-performance"
import BrandingSlide from "./components/branding-slide"
import GoalsScreen from "./components/goals-screen"
import AnalyticsCharts from "./components/analytics-charts"
import RedAtlasDB from "./components/RedAtlasDB";
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState(0) // Start with first screen
  const [autoPlay, setAutoPlay] = useState(true) // Enable auto-play by default
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  
  const screens = [
    <BusinessOverview key="business" />, // 1. Stripe y métricas de negocio
    <AdsPerformance key="ads" />,        // 2. Google Analytics
    <GoalsScreen key="goals" />,         // 3. Metas
    <AnalyticsCharts key="charts" />,    // 4. Gráficos de tendencias
    <BrandingSlide key="branding" />,     // 5. Red Atlas
    <RedAtlasDB key="redAtlasDB" /> // 6. Red Atlas DB Data
  ]

  // All screens enabled in the correct order
  const enabledScreens = [0, 1, 2, 3, 4, 5]; // All screens: Stripe, Analytics, Goals, Charts, Red Atlas, Atlas Data

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

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem("dashboard_authenticated")
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const correctPassword = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD || "redatlas2024@!"
    
    if (password === correctPassword) {
      setIsAuthenticated(true)
      setError("")
      // Store authentication in localStorage to persist across page reloads
      localStorage.setItem("dashboard_authenticated", "true")
    } else {
      setError("Contraseña incorrecta")
    }
  }

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const isAuth = localStorage.getItem("dashboard_authenticated") === "true"
    setIsAuthenticated(isAuth)
  }, [])

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">RED Atlas</h1>
            <p className="text-gray-600">Dashboard de métricas</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="w-full"
                required
              />
            </div>
            
            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}
            
            <Button type="submit" className="w-full">
              Ingresar
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 relative">
      {/* Main content */}
      <div className="relative">
        {screens[currentScreen]}
      </div>

      {/* Logout button - moved to bottom right */}
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


    </main>
  )
}
