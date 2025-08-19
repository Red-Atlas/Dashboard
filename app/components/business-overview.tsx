"use client"

import { useState, useEffect } from "react"
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, LabelList } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import Image from "next/image"

interface BusinessMetrics {
  activeUsers: number
  activeUsersPercentageChange: number
  registeredUsers: number
  pageViewsYesterday: number
  pageViewsByDay: Array<{ date: string; views: number; fullDate?: string }>
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
  monthly_count: number
  yearly_count: number
}


interface Transaction {
  amount: number
  email: string
  date: string
  time?: string
  currency?: string
  status?: string
  customer_name?: string
  coupon_name?: string
}

interface RevenueMetrics {
  totalRevenue: number
  transactionCount: number
  averageTransaction: number
  currency: string
  percentageChange: number
  previousRevenue: number
  transactionPercentageChange: number
  previousTransactionCount: number
  grossRevenue?: number
  totalFees?: number
  feePercentage?: number
}

interface MetricCardProps {
  title: string
  value: number | null
  loading: boolean
  subtitle?: string
  color?: "green" | "gray"
  isCurrency?: boolean
  isEuropeanFormat?: boolean
  percentageChange?: number
}

// Helper function for American number formatting (thousands with , and decimals with .)
const formatEuropeanNumber = (val: number) => {
  const parts = val.toFixed(2).split('.')
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const decimalPart = parts[1]
  return `${integerPart}.${decimalPart}`
}

// Helper function for American integer formatting (thousands with , and decimals with .)
const formatEuropeanInteger = (val: number) => {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function MetricCard({ title, value, loading, subtitle, color = "gray", isCurrency = false, isEuropeanFormat = false, percentageChange }: MetricCardProps) {
  const textColor = color === "green" ? "text-green-600" : "text-gray-900"
  
  const formatValue = (val: number | null) => {
    if (val === null) return "0"
    if (isCurrency) {
      const formatted = formatEuropeanNumber(val)
      console.log('Manual formatting currency:', val, 'Result:', formatted)
      return `$${formatted}`
    }
    if (isEuropeanFormat) {
      const formatted = formatEuropeanInteger(val)
      console.log('Manual formatting integer:', val, 'Result:', formatted)
      return formatted
    }
    return val.toLocaleString('es-ES')
  }

  const formatPercentageChange = (change: number) => {
    const isPositive = change >= 0
    const symbol = isPositive ? "↗" : "↘"
    const colorClass = isPositive ? "text-green-600" : "text-red-600"
    return (
      <span className={`text-sm font-semibold ${colorClass} ml-3`}>
        {symbol} {Math.abs(change).toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 relative">
      {loading ? (
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        </div>
      ) : (
        <>
          <div className={`text-5xl font-bold ${textColor} mb-2 flex items-center`}>
            {formatValue(value)}
            {percentageChange !== undefined && formatPercentageChange(percentageChange)}
          </div>
          <div className="text-lg text-gray-700">{title}</div>
          {subtitle && <div className="text-xs text-gray-500 absolute bottom-4 right-6">{subtitle}</div>}
        </>
      )}
    </div>
  )
}

export default function BusinessOverview() {
  const [metrics, setMetrics] = useState<BusinessMetrics>({
    activeUsers: 0,
    activeUsersPercentageChange: 0,
    registeredUsers: 0,
    pageViewsYesterday: 0,
    pageViewsByDay: [],
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionData | null>(null)
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics>({
    totalRevenue: 0,
    transactionCount: 0,
    averageTransaction: 0,
    currency: 'USD',
    percentageChange: 0,
    previousRevenue: 0,
    transactionPercentageChange: 0,
    previousTransactionCount: 0,
  })
  const [loading, setLoading] = useState({
    activeUsers: true,
    registeredUsers: true,
    pageViews: true,
    transactions: true,
    revenue: true,
    subscriptions: true,
  })
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchActiveUsers = async () => {
    setLoading((prev) => ({ ...prev, activeUsers: true }))
    try {
      const response = await fetch("/api/metrics/active-users-30min")
      const data = await response.json()
      setMetrics((prev) => ({ 
        ...prev, 
        activeUsers: data.value,
        activeUsersPercentageChange: data.percentageChange || 0
      }))
    } catch (error) {
      console.error("Failed to fetch active users:", error)
    } finally {
      setLoading((prev) => ({ ...prev, activeUsers: false }))
    }
  }

  const fetchRegisteredUsers = async () => {
    setLoading((prev) => ({ ...prev, registeredUsers: true }))
    try {
      const response = await fetch("/api/metrics/registered-users")
      const data = await response.json()
      setMetrics((prev) => ({ ...prev, registeredUsers: data.value }))
    } catch (error) {
      console.error("Failed to fetch registered users:", error)
    } finally {
      setLoading((prev) => ({ ...prev, registeredUsers: false }))
    }
  }

  const fetchPageViews = async () => {
    setLoading((prev) => ({ ...prev, pageViews: true }))
    try {
      const [pageViewsYesterday, pageViewsByDay] = await Promise.all([
        fetch("/api/metrics/page-views-today").then((r) => r.json()),
        fetch("/api/metrics/page-views-by-hour").then((r) => r.json()),
      ])

      setMetrics((prev) => ({
        ...prev,
        pageViewsYesterday: pageViewsYesterday.value,
        pageViewsByDay: pageViewsByDay.data,
      }))
    } catch (error) {
      console.error("Failed to fetch page views:", error)
    } finally {
      setLoading((prev) => ({ ...prev, pageViews: false }))
    }
  }

  const fetchTransactions = async () => {
    setLoading((prev) => ({ ...prev, transactions: true }))
    try {
      const response = await fetch("/api/metrics/stripe-transactions")
      const data = await response.json()
      console.log('Transactions API response:', data);
      console.log('Is array?', Array.isArray(data));
      console.log('Length:', Array.isArray(data) ? data.length : 'Not an array');
      // Asegurar que data sea un array
      setTransactions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
      setTransactions([]) // En caso de error, establecer array vacío
    } finally {
      setLoading((prev) => ({ ...prev, transactions: false }))
    }
  }

  const fetchRevenueMetrics = async () => {
    setLoading((prev) => ({ ...prev, revenue: true }))
    try {
      const response = await fetch("/api/metrics/stripe-revenue")
      const data = await response.json()
      setRevenueMetrics(data)
    } catch (error) {
      console.error("Failed to fetch revenue metrics:", error)
    } finally {
      setLoading((prev) => ({ ...prev, revenue: false }))
    }
  }

  const fetchSubscriptions = async () => {
    setLoading((prev) => ({ ...prev, subscriptions: true }))
    try {
      const response = await fetch("/api/metrics/stripe-subscriptions")
      const data = await response.json()
      setSubscriptions(data)
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error)
    } finally {
      setLoading((prev) => ({ ...prev, subscriptions: false }))
    }
  }

  const fetchAllMetrics = async () => {
    await Promise.all([fetchActiveUsers(), fetchRegisteredUsers(), fetchPageViews(), fetchTransactions(), fetchRevenueMetrics(), fetchSubscriptions()])
    setLastUpdated(new Date())
  }

  useEffect(() => {
    // Initial fetch
    fetchAllMetrics()

    // Todas las métricas se actualizan cada 5 minutos
    const generalInterval = setInterval(
      () => {
        fetchActiveUsers()
        fetchRegisteredUsers()
        fetchPageViews()
        fetchTransactions()
        fetchRevenueMetrics()
        fetchSubscriptions()
        setLastUpdated(new Date())
      },
      5 * 60 * 1000, // 5 minutos
    )

    return () => {
      clearInterval(generalInterval)
    }
  }, [])

  const formatDateTime = (dateString: string, timeString?: string) => {
    // Parse date string in local timezone to avoid UTC conversion issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    
    // If time is available, include it
    if (timeString) {
      return `${formattedDate} • ${timeString}`
    }
    
    return formattedDate
  }

  return (
    <div className="min-h-screen p-8 relative">
      {/* Logo en esquina superior izquierda */}
      <div className="absolute top-8 left-8">
        <Image src="/red-atlas-logo.png" alt="RED Atlas Logo" width={200} height={60} className="h-16 w-auto" />
      </div>

      {/* Títulos en esquina superior derecha */}
      <div className="absolute top-8 right-8 text-right">
        <p className="text-xl text-gray-600">Resumen comercial</p>
      </div>

      {/* Contenido principal con margen superior para el header */}
      <div className="mt-24">
        {/* Two Column Layout */}
        <div className="grid grid-cols-5 gap-8 mb-8">
          {/* Left Column - 60% width (3/5) */}
          <div className="col-span-3 space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-6">
              <MetricCard
                title="Usuarios Activos"
                value={metrics.activeUsers}
                loading={loading.activeUsers}
                subtitle="Últimos 30 minutos"
                color="green"
                isEuropeanFormat={true}
                percentageChange={metrics.activeUsersPercentageChange}
              />
              <MetricCard
                title="Suscripciones Activas"
                value={subscriptions?.active_count || 0}
                loading={loading.subscriptions}
                color="green"
                isEuropeanFormat={true}
                // Agregar desglose mensual/anual a la derecha
                subtitle={
                  subscriptions
                    ? `Mensual: ${subscriptions.monthly_count || 0} | Anual: ${subscriptions.yearly_count || 0}`
                    : undefined
                }
              />
              <MetricCard
                title="Volumen de ventas neto"
                value={revenueMetrics.totalRevenue}
                loading={loading.revenue}
                subtitle="Últimas 4 semanas"
                color="green"
                isCurrency={true}
                percentageChange={revenueMetrics.percentageChange}
              />
              <MetricCard
                title="Transacciones exitosas"
                value={revenueMetrics.transactionCount}
                loading={loading.revenue}
                subtitle="Últimas 4 semanas"
                isEuropeanFormat={true}
                percentageChange={revenueMetrics.transactionPercentageChange}
              />
            </div>

            {/* Page Views Card with Chart - altura fija */}
            <div className="bg-white rounded-2xl shadow-lg p-6 h-96">
              {loading.pageViews ? (
                <div className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-5xl font-bold text-gray-900 mb-2">{formatEuropeanInteger(metrics.pageViewsYesterday)}</div>
                  <div className="text-lg text-gray-700 mb-2">Páginas vistas</div>
                  <div className="text-sm text-gray-500 mb-4">Últimos 7 días</div>

                  {metrics.pageViewsByDay.length > 0 && (
                    <div className="h-64 -mx-2">
                      <ChartContainer
                        config={{
                          views: {
                            label: "Views",
                            color: "#d31216",
                          },
                        }}
                        className="h-full w-full"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={metrics.pageViewsByDay.slice(-7)} margin={{ top: 30, right: 10, left: 10, bottom: 25 }}>
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
                                `${formatEuropeanInteger(parseInt(value))} views`,
                                'Page Views'
                              ]}
                              labelFormatter={(label: any) => {
                                // Detectar si es HOY comparando con la fecha actual
                                const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                                return label === today ? `${label} (HOY - En vivo)` : `${label}`;
                              }}
                            />
                            <Bar 
                              dataKey="views" 
                              fill="#d31216"
                              radius={[2, 2, 0, 0]}
                            >
                              <LabelList 
                                dataKey="views" 
                                position="top" 
                                style={{ 
                                  fontSize: '10px', 
                                  fill: '#374151',
                                  fontWeight: '600'
                                }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Column - 40% width (2/5) - altura fija para coincidir */}
          <div className="col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col" style={{ height: "43.5rem" }}>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Últimas transacciones</h3>

              {loading.transactions ? (
                <div className="space-y-3 flex-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex justify-between items-center py-2">
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-hidden">
                  {(Array.isArray(transactions) ? transactions : []).slice(0, 7).map((transaction, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-semibold text-gray-900">
                            ${transaction.amount.toFixed(2)} {transaction.currency || 'USD'}
                          </div>
                          {transaction.status && (
                            <span 
                              className={`px-2 py-1 text-xs rounded-full ${
                                transaction.status === 'succeeded' 
                                  ? 'bg-green-100 text-green-800' 
                                  : transaction.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {transaction.status}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          {transaction.customer_name || transaction.email}
                        </div>
                        {transaction.customer_name && (
                          <div className="text-xs text-gray-400 truncate">{transaction.email}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end text-sm text-gray-500 ml-4 flex-shrink-0">
                        <div className="flex items-center gap-3 text-sm text-gray-500 ml-4 flex-shrink-0">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-gray-700 text-xs">Cupón:</span>
                            {transaction.coupon_name ? (
                              <span className="font-bold text-blue-600 text-xs">
                                {transaction.coupon_name}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span> // Simple dash instead of line
                            )}
                          </div>
                          <span>•</span>
                          <span>
                            {formatDateTime(transaction.date, transaction.time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>



        {/* Footer */}
        <div className="flex justify-end items-center mt-8">
          <div className="text-gray-500">
            Última actualización:{" "}
            {lastUpdated.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
