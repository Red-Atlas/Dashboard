"use client"

import { useState, useEffect } from "react"

import Image from "next/image"

interface UserMetrics {
  activeUsersYesterday: {
    value: number
    previousValue: number
    percentageChange: number
    trend: 'up' | 'down' | 'neutral'
  }
  activeUsers7days: {
    value: number
    previousValue: number
    percentageChange: number
    trend: 'up' | 'down' | 'neutral'
  }
}

interface SubscriptionData {
  active_count: number
  churn_rate: number
  mrr: number
  latest_subscriptions: Array<{
    id: string
    customer_name: string
    customer_email: string
    amount: number
    currency: string
    status: string
    created: string
    product_name: string
  }>
}

interface OperatingSystemData {
  os: string
  users: number
}

interface CountryData {
  country: string
  users: number
}

// Helper function for American integer formatting (thousands with , and decimals with .)
const formatEuropeanInteger = (val: number) => {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function AdsPerformance() {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null)
  const [registeredUsers, setRegisteredUsers] = useState<number>(0)
  const [osData, setOsData] = useState<OperatingSystemData[]>([])
  const [countryData, setCountryData] = useState<CountryData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMetrics = async () => {
    try {
      const [activeUsersYesterday, activeUsers7days, registeredUsersData, devicesData, geoData] = await Promise.all([
        fetch("/api/metrics/active-users-yesterday").then((r) => r.json()),
        fetch("/api/metrics/active-users-7days").then((r) => r.json()),
        fetch("/api/metrics/registered-users").then((r) => r.json()),
        fetch("/api/metrics/device-breakdown").then((r) => r.json()),
        fetch("/api/metrics/geographic-breakdown").then((r) => r.json()),
      ])

      setMetrics({
        activeUsersYesterday: {
          value: activeUsersYesterday.value,
          previousValue: activeUsersYesterday.previousValue,
          percentageChange: activeUsersYesterday.percentageChange,
          trend: activeUsersYesterday.trend
        },
        activeUsers7days: {
          value: activeUsers7days.value,
          previousValue: activeUsers7days.previousValue,
          percentageChange: activeUsers7days.percentageChange,
          trend: activeUsers7days.trend
        },
      })

      setRegisteredUsers(registeredUsersData.value)
      setOsData(devicesData.data)
      setCountryData(geoData.data)
      
      console.log('OS Data:', devicesData.data)
      console.log('Country Data:', geoData.data)
    } catch (error) {
      console.error("Failed to fetch ads metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [])

  // Componente funcional sin constantes adicionales necesarias

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-gray-600">Cargando...</div>
      </div>
    )
  }


  return (
    <div className="min-h-screen p-8 relative">
      {/* Logo en esquina superior izquierda */}
      <div className="absolute top-8 left-8">
        <Image src="/red-atlas-logo.png" alt="RED Atlas Logo" width={200} height={60} className="h-16 w-auto" />
      </div>

      {/* Títulos en esquina superior derecha */}
      <div className="absolute top-8 right-8 text-right">
        <p className="text-xl text-gray-600">Métricas de usuarios</p>
      </div>

              {/* Contenido principal con margen superior para el header */}
        <div className="mt-24 px-8">
          {/* Top Metrics - 3 cards principales */}
          <div className="grid grid-cols-3 gap-6 mb-8 max-w-7xl mx-auto">
                                  {/* Active Users Yesterday */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              {metrics?.activeUsersYesterday && (
                <div className="flex justify-end mb-2">
                  <div className={`text-sm font-semibold ${
                    metrics.activeUsersYesterday.trend === 'up' ? 'text-green-600' : 
                    metrics.activeUsersYesterday.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {metrics.activeUsersYesterday.trend === 'up' ? '↗' : 
                     metrics.activeUsersYesterday.trend === 'down' ? '↘' : '→'} {Math.abs(metrics.activeUsersYesterday.percentageChange).toFixed(1)}%
                  </div>
                </div>
              )}
              <div className="text-6xl font-bold text-green-600 mb-4 text-center">{metrics?.activeUsersYesterday.value ? formatEuropeanInteger(metrics.activeUsersYesterday.value) : 0}</div>
              <div className="text-xl text-gray-700 font-semibold text-center">Usuarios Activos</div>
              <div className="text-xs text-gray-500 text-center mt-2">Ayer (acumulados)</div>
            </div>

            {/* Active Users 7 Days */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              {metrics?.activeUsers7days && (
                <div className="flex justify-end mb-2">
                  <div className={`text-sm font-semibold ${
                    metrics.activeUsers7days.trend === 'up' ? 'text-green-600' : 
                    metrics.activeUsers7days.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {metrics.activeUsers7days.trend === 'up' ? '↗' : 
                     metrics.activeUsers7days.trend === 'down' ? '↘' : '→'} {Math.abs(metrics.activeUsers7days.percentageChange).toFixed(1)}%
                  </div>
                </div>
              )}
              <div className="text-6xl font-bold text-gray-900 mb-4 text-center">{metrics?.activeUsers7days.value ? formatEuropeanInteger(metrics.activeUsers7days.value) : 0}</div>
              <div className="text-xl text-gray-700 font-semibold text-center">Usuarios Activos</div>
              <div className="text-xs text-gray-500 text-center mt-2">Últimos 7 días</div>
            </div>

            {/* Registered Users */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="mb-2" style={{ height: '20px' }}></div>
              <div className="text-6xl font-bold text-gray-900 mb-4 text-center">{formatEuropeanInteger(registeredUsers || 0)}</div>
              <div className="text-xl text-gray-700 font-semibold text-center">Usuarios Registrados</div>
              <div className="text-xs text-gray-500 text-center mt-2">Últimos 28 días</div>
            </div>
          </div>

          {/* Análisis Detallado - Grid de 2 columnas */}
          <div className="grid grid-cols-2 gap-6 mb-6 max-w-7xl mx-auto">
            {/* Sistemas Operativos - Tabla */}
            <div className="bg-white rounded-2xl shadow-lg p-7">
              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Usuarios Activos por Sistema Operativo</h3>
              <p className="text-gray-600 text-center mb-5">(Últimos 28 días)</p>
              {osData.length > 0 ? (
                <div className="overflow-hidden">
                  <div className="grid grid-cols-2 gap-4 pb-3 border-b-2 border-gray-200 font-semibold text-gray-700">
                    <div>Sistema Operativo</div>
                    <div className="text-center">Usuarios Activos</div>
                  </div>
                  <div>
                    {osData.slice(0, 7).map((os, index) => (
                      <div 
                        key={index} 
                        className="grid grid-cols-2 gap-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900 flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            os.os === 'Windows' ? 'bg-blue-500' :
                            os.os === 'iOS' ? 'bg-gray-700' :
                            os.os === 'Android' ? 'bg-green-500' :
                            os.os === 'Macintosh' ? 'bg-gray-400' :
                            os.os === 'Linux' ? 'bg-yellow-500' :
                            'bg-purple-500'
                          }`}></div>
                          {os.os}
                        </div>
                        <div className="text-center text-gray-700 font-semibold">
                          {os.users >= 1000 ? `${(os.users / 1000).toFixed(1)}k` : formatEuropeanInteger(os.users)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Cargando datos de sistemas operativos...</p>
                </div>
              )}
            </div>

            {/* Países - Tabla */}
            <div className="bg-white rounded-2xl shadow-lg p-7">
              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Usuarios Activos por País</h3>
              <p className="text-gray-600 text-center mb-5">(Últimos 28 días)</p>
              {countryData.length > 0 ? (
                <div className="overflow-hidden">
                  <div className="grid grid-cols-2 gap-4 pb-3 border-b-2 border-gray-200 font-semibold text-gray-700">
                    <div>País</div>
                    <div className="text-center">Usuarios Activos</div>
                  </div>
                  <div>
                    {countryData.slice(0, 7).map((country, index) => (
                      <div 
                        key={index} 
                        className="grid grid-cols-2 gap-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">
                          {country.country}
                        </div>
                        <div className="text-center text-gray-700 font-semibold">
                          {country.users >= 1000 ? `${(country.users / 1000).toFixed(1)}k` : formatEuropeanInteger(country.users)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Cargando datos de países...</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-4">
            <div className="text-gray-500 text-lg font-medium">Marketing Performance Dashboard</div>
          </div>
      </div>
    </div>
  )
}
