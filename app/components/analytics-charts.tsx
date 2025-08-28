"use client"

import { useState, useEffect } from "react"
import { Line, LineChart, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import Image from "next/image"

interface ChartData {
  date: string
  value: number
}

interface AnalyticsData {
  paidUsers: ChartData[]
  activeUsers: ChartData[]
  pageViews: ChartData[]
  revenue: ChartData[]
}

interface ChartCardProps {
  title: string
  data: ChartData[]
  loading: boolean
  color: string
  format?: "number" | "currency"
  subtitle?: string
}

function ChartCard({ title, data, loading, color, format = "number", subtitle }: ChartCardProps) {
  const formatValue = (value: number) => {
    if (format === "currency") {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }
    return value.toLocaleString('en-US')
  }

  const getLatestValue = () => {
    if (data.length === 0) return 0
    return data[data.length - 1].value
  }

  const getPreviousValue = () => {
    if (data.length < 2) return 0
    return data[data.length - 2].value
  }

  const calculateChange = () => {
    const current = getLatestValue()
    const previous = getPreviousValue()
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const change = calculateChange()
  const isPositive = change >= 0

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {loading ? (
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {formatValue(getLatestValue())}
                </span>
                {change !== 0 && (
                  <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '↗' : '↘'} {Math.abs(change).toFixed(1)}%
                  </span>
                )}
              </div>
              {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
            </div>
          </div>
          
                     <div className="h-56 -mx-2">
            <ChartContainer
              config={{
                value: {
                  label: title,
                  color: color,
                },
              }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    formatter={(value: any, name: any) => [
                      formatValue(parseInt(value)),
                      title
                    ]}
                  />
                  <Line 
                    type="monotone"
                    dataKey="value" 
                    stroke={color}
                    strokeWidth={3}
                    dot={{ fill: color, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </>
      )}
    </div>
  )
}

export default function AnalyticsCharts() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    paidUsers: [],
    activeUsers: [],
    pageViews: [],
    revenue: []
  })
  const [loading, setLoading] = useState({
    paidUsers: true,
    activeUsers: true,
    pageViews: true,
    revenue: true
  })

  const fetchAnalyticsData = async () => {
    setLoading({
      paidUsers: true,
      activeUsers: true,
      pageViews: true,
      revenue: true
    })

    try {
             // Fetch all data in parallel (including historical data)
       const [subscriptions, registeredUsers, pageViewsToday, pageViewsByHour, revenue, subscriptionsHistory, registeredUsersHistory, revenueHistory] = await Promise.all([
         fetch("/api/metrics/stripe-subscriptions").then(r => r.json()),
         fetch("/api/metrics/registered-users").then(r => r.json()),
         fetch("/api/metrics/page-views-today").then(r => r.json()),
         fetch("/api/metrics/page-views-by-hour").then(r => r.json()),
         fetch("/api/metrics/stripe-revenue").then(r => r.json()),
         fetch("/api/metrics/stripe-subscriptions-history").then(r => r.json()),
         fetch("/api/metrics/registered-users-history").then(r => r.json()),
         fetch("/api/metrics/stripe-revenue-history").then(r => r.json())
       ])

             // Generate mock data for the last 7 days (since we don't have historical data)
       const generateMockData = (baseValue: number, variation: number = 0.2, maxMultiplier: number = 1.3) => {
         const data = []
         const today = new Date()
         
         // If base value is too low, use a minimum value for better visualization
         const effectiveBaseValue = baseValue > 0 ? baseValue : 10
         
         for (let i = 6; i >= 0; i--) {
           const date = new Date(today)
           date.setDate(date.getDate() - i)
           
           // Add some random variation to make it look realistic
           const randomVariation = 1 + (Math.random() - 0.5) * variation
           let value = Math.round(effectiveBaseValue * randomVariation)
           
           // Ensure minimum values for better visualization (70% del valor base)
           if (value < effectiveBaseValue * 0.7) {
             value = Math.round(effectiveBaseValue * 0.7)
           }
           
           // Ensure maximum values don't exceed the specified multiplier for better chart scaling
           if (value > effectiveBaseValue * maxMultiplier) {
             value = Math.round(effectiveBaseValue * maxMultiplier)
           }
           
           data.push({
             date: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
             value: value
           })
         }
         return data
       }

             // Use historical data from APIs
       const paidUsersData = subscriptionsHistory.data ? subscriptionsHistory.data.map((item: any) => ({
         date: item.date,
         value: item.value
       })) : []
       
       // Use historical registered users data
       const registeredUsersData = registeredUsersHistory.data ? registeredUsersHistory.data.map((item: any) => ({
         date: item.date,
         value: item.value
       })) : []
       
       // Use page views from page-views-by-hour API (same as business-overview.tsx)
       // Convert the data format to match our chart format
       const pageViewsData = pageViewsByHour.data ? pageViewsByHour.data.slice(-7).map((item: any) => ({
         date: item.date,
         value: item.views
       })) : []
       
       // Use historical revenue data
       const revenueData = revenueHistory.data ? revenueHistory.data.map((item: any) => ({
         date: item.date,
         value: item.value
       })) : []

             setAnalyticsData({
         paidUsers: paidUsersData,
         activeUsers: registeredUsersData, // Using registered users data
         pageViews: pageViewsData,
         revenue: revenueData
       })
    } catch (error) {
      console.error("Failed to fetch analytics data:", error)
    } finally {
      setLoading({
        paidUsers: false,
        activeUsers: false,
        pageViews: false,
        revenue: false
      })
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchAnalyticsData, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen p-8 relative bg-gray-50">
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <Image src="/red-atlas-logo.png" alt="RED Atlas Logo" width={200} height={60} className="h-16 w-auto" />
      </div>

      {/* Title */}
      <div className="absolute top-8 right-8 text-right">
        <p className="text-xl text-gray-600">Análisis de tendencias</p>
      </div>

             {/* Content */}
       <div className="mt-24">
         <div className="max-w-7xl mx-auto">
           {/* Charts Grid */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                         <ChartCard
               title="Suscripciones Activas"
               data={analyticsData.paidUsers}
               loading={loading.paidUsers}
               color="#10b981"
               format="number"
               subtitle="Suscripciones activas"
             />
            
                         <ChartCard
               title="Usuarios Registrados"
               data={analyticsData.activeUsers}
               loading={loading.activeUsers}
               color="#3b82f6"
               format="number"
               subtitle="Usuarios registrados (últimos 7 días)"
             />
            
            <ChartCard
              title="Page Views"
              data={analyticsData.pageViews}
              loading={loading.pageViews}
              color="#ef4444"
              format="number"
              subtitle="Vistas de página diarias"
            />
            
            <ChartCard
              title="Volumen de Ventas"
              data={analyticsData.revenue}
              loading={loading.revenue}
              color="#f59e0b"
              format="currency"
              subtitle="Ventas netas diarias"
            />
          </div>

          
        </div>
      </div>
    </div>
  )
}
