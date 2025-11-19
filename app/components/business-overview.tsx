"use client";

import { useState, useEffect } from "react";
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  LabelList,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import Image from "next/image";
import { apiCache } from "@/app/utils/apiCache";
import { CACHE_DURATION_MS, CACHE_CONFIG } from "@/app/config/cache";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BusinessMetrics {
  activeUsers: number;
  activeUsersPercentageChange: number;
  registeredUsers: number;
  pageViewsYesterday: number;
  pageViewsByDay: Array<{ date: string; views: number; fullDate?: string }>;
}

interface SubscriptionData {
  active_count: number;
  churn_rate: number;
  mrr: number;
  latest_subscriptions: Array<{
    id: string;
    customer_name: string;
    customer_email: string;
    amount: number;
    currency: string;
    status: string;
    created: string;
    product_name: string;
  }>;
  monthly_count: number;
  yearly_count: number;
}

interface Transaction {
  amount: number;
  email: string;
  date: string;
  time?: string;
  currency?: string;
  status?: string;
  customer_name?: string;
  coupon_name?: string;
  amount_saved?: number | null;
  failure_reason?: string | null;
  failure_code?: string | null;
}

interface RevenueMetrics {
  totalRevenue: number;
  transactionCount: number;
  averageTransaction: number;
  currency: string;
  percentageChange: number;
  previousRevenue: number;
  transactionPercentageChange: number;
  previousTransactionCount: number;
  grossRevenue?: number;
  totalFees?: number;
  feePercentage?: number;
  currencyBreakdown?: {
    usd: number;
    cop: number;
    copInUSD: number;
    exchangeRate: number;
  };
}

interface MetricCardProps {
  title: string;
  value: number | null;
  loading: boolean;
  subtitle?: string;
  color?: "green" | "gray";
  isCurrency?: boolean;
  isEuropeanFormat?: boolean;
  percentageChange?: number;
  externalNote?: string;
  goal?: number;
  currencyBreakdown?: {
    usd: number;
    cop: number;
    copInUSD: number;
    exchangeRate: number;
  };
}

// Helper function for American number formatting (thousands with , and decimals with .)
const formatEuropeanNumber = (val: number) => {
  const parts = val.toFixed(2).split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimalPart = parts[1];
  return `${integerPart}.${decimalPart}`;
};

// Helper function for American integer formatting (thousands with , and decimals with .)
const formatEuropeanInteger = (val: number) => {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

function MetricCard({
  title,
  value,
  loading,
  subtitle,
  color = "gray",
  isCurrency = false,
  isEuropeanFormat = false,
  percentageChange,
  externalNote,
  goal,
  currencyBreakdown,
}: MetricCardProps) {
  const textColor = color === "green" ? "text-green-600" : "text-gray-900";

  const formatValue = (val: number | null) => {
    if (val === null) return "0";
    if (isCurrency) {
      const formatted = formatEuropeanNumber(val);
      return `$${formatted}`;
    }
    if (isEuropeanFormat) {
      const formatted = formatEuropeanInteger(val);
      return formatted;
    }
    return val.toLocaleString("es-ES");
  };

  const formatPercentageChange = (change: number) => {
    const isPositive = change >= 0;
    const symbol = isPositive ? "↗" : "↘";
    const colorClass = isPositive ? "text-green-600" : "text-red-600";
    return (
      <span className={`text-sm font-semibold ${colorClass} ml-3`}>
        {symbol} {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 relative">
      {loading ? (
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        </div>
      ) : (
        <>
          <div
            className={`text-5xl font-bold ${textColor} mb-2 flex items-center`}
          >
            {formatValue(value)}
            {goal && (
              <span className="text-lg font-normal text-gray-500 ml-2">
                (meta: {formatEuropeanInteger(goal)})
              </span>
            )}
            {percentageChange !== undefined &&
              formatPercentageChange(percentageChange)}
          </div>
          <div className="text-lg text-gray-700">{title}</div>
          {currencyBreakdown && (
            <div className="text-xs text-gray-600 mt-2 space-y-1">
              <div>💵 USD: ${formatEuropeanNumber(currencyBreakdown.usd)}</div>
              <div>
                🇨🇴 COP: ${formatEuropeanNumber(currencyBreakdown.cop)} (≈ $
                {formatEuropeanNumber(currencyBreakdown.copInUSD)} USD)
              </div>
              <div className="text-gray-400">
                Tasa: 1 USD = {currencyBreakdown.exchangeRate.toLocaleString()}{" "}
                COP
              </div>
            </div>
          )}
          {subtitle && (
            <div className="text-xs text-gray-500 absolute bottom-4 right-6">
              {subtitle}
            </div>
          )}
          {externalNote && title === "Volumen de ventas neto" && (
            <div className="text-xs text-gray-500 absolute top-4 right-6">
              {externalNote}
            </div>
          )}
          {externalNote && title === "Suscripciones Activas" && (
            <div className="text-xs text-gray-500 absolute top-4 right-6">
              ({externalNote})
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function BusinessOverview() {
  const [metrics, setMetrics] = useState<BusinessMetrics>({
    activeUsers: 0,
    activeUsersPercentageChange: 0,
    registeredUsers: 0,
    pageViewsYesterday: 0,
    pageViewsByDay: [],
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData | null>(
    null
  );
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics>({
    totalRevenue: 0,
    transactionCount: 0,
    averageTransaction: 0,
    currency: "USD",
    percentageChange: 0,
    previousRevenue: 0,
    transactionPercentageChange: 0,
    previousTransactionCount: 0,
  });
  const [loading, setLoading] = useState({
    activeUsers: true,
    registeredUsers: true,
    pageViews: true,
    transactions: true,
    revenue: true,
    subscriptions: true,
  });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [previousTransactionCount, setPreviousTransactionCount] =
    useState<number>(0);
  const [lastTransactionTime, setLastTransactionTime] = useState<Date>(
    new Date()
  );
  const [cricketsPlayed, setCricketsPlayed] = useState<boolean>(false);
  const [previousSubscriptionCount, setPreviousSubscriptionCount] =
    useState<number>(0);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Function to enable audio automatically
  const enableAudio = () => {
    // Create a silent audio to "unlock" audio playback
    const silentAudio = new Audio();
    silentAudio.volume = 0;
    silentAudio
      .play()
      .then(() => {
        setAudioEnabled(true);
      })
      .catch(() => {
        // Audio enable failed
      });
  };

  // Function to play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio("/sounds/notification.mp3");
      audio.volume = 0.8; // Volume at 80%
      audio.play().catch(() => {});
    } catch (error) {
      // Sound playback failed
    }
  };

  // Function to play crickets sound (inactivity)
  const playCricketsSound = () => {
    try {
      const audio = new Audio("/sounds/crickets.mp3");
      audio.volume = 0.6; // Volume at 60%
      audio.play().catch(() => {});
    } catch (error) {
      // Sound playback failed
    }
  };

  // Function to play fail sound (subscription loss)
  const playFailSound = () => {
    try {
      const audio = new Audio("/sounds/fail.mp3");
      audio.volume = 0.7; // Volume at 70%
      audio.play().catch(() => {});
    } catch (error) {
      // Sound playback failed
    }
  };

  const fetchActiveUsers = async () => {
    setLoading((prev) => ({ ...prev, activeUsers: true }));
    try {
      const data = await apiCache.fetch(
        "/api/metrics/active-users-30min",
        CACHE_CONFIG.REALTIME * 1000
      );
      setMetrics((prev) => ({
        ...prev,
        activeUsers: data.value,
        activeUsersPercentageChange: data.percentageChange || 0,
      }));
    } catch (error) {
      console.error("Failed to fetch active users:", error);
    } finally {
      setLoading((prev) => ({ ...prev, activeUsers: false }));
    }
  };

  const fetchRegisteredUsers = async () => {
    setLoading((prev) => ({ ...prev, registeredUsers: true }));
    try {
      const data = await apiCache.fetch(
        "/api/metrics/registered-users",
        CACHE_DURATION_MS
      );
      setMetrics((prev) => ({ ...prev, registeredUsers: data.value }));
    } catch (error) {
      console.error("Failed to fetch registered users:", error);
    } finally {
      setLoading((prev) => ({ ...prev, registeredUsers: false }));
    }
  };

  const fetchPageViews = async () => {
    setLoading((prev) => ({ ...prev, pageViews: true }));
    try {
      const [pageViewsYesterday, pageViewsByDay] = await Promise.all([
        apiCache.fetch("/api/metrics/page-views-today", CACHE_DURATION_MS),
        apiCache.fetch("/api/metrics/page-views-by-hour", CACHE_DURATION_MS),
      ]);

      setMetrics((prev) => ({
        ...prev,
        pageViewsYesterday: pageViewsYesterday.value,
        pageViewsByDay: pageViewsByDay.data,
      }));
    } catch (error) {
      console.error("Failed to fetch page views:", error);
    } finally {
      setLoading((prev) => ({ ...prev, pageViews: false }));
    }
  };

  const fetchTransactions = async () => {
    setLoading((prev) => ({ ...prev, transactions: true }));
    try {
      const response = await fetch("/api/metrics/stripe-transactions", {
        cache: "no-store", // Sempre buscar dados frescos
      });
      const data = await response.json();

      // Asegurar que data sea un array
      const newTransactions = Array.isArray(data) ? data : [];

      // Detectar si hay nuevas transacciones comparando IDs o fechas
      if (newTransactions.length > 0 && transactions.length > 0) {
        // Comparar la primera transacción (más reciente) con la anterior
        const latestNewTransaction = newTransactions[0];
        const latestCurrentTransaction = transactions[0];

        // Si las fechas son diferentes, es una nueva transacción
        if (
          latestNewTransaction.date !== latestCurrentTransaction.date ||
          latestNewTransaction.time !== latestCurrentTransaction.time
        ) {
          playNotificationSound();
          setLastTransactionTime(new Date());
          setCricketsPlayed(false);
        }
      } else if (
        newTransactions.length > previousTransactionCount &&
        previousTransactionCount > 0
      ) {
        playNotificationSound();
        setLastTransactionTime(new Date());
        setCricketsPlayed(false);
      }

      setPreviousTransactionCount(newTransactions.length);
      setTransactions(newTransactions);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      setTransactions([]); // En caso de error, establecer array vacío
    } finally {
      setLoading((prev) => ({ ...prev, transactions: false }));
    }
  };

  const fetchRevenueMetrics = async () => {
    setLoading((prev) => ({ ...prev, revenue: true }));
    try {
      const data = await apiCache.fetch(
        "/api/metrics/stripe-revenue",
        CACHE_DURATION_MS
      );
      setRevenueMetrics(data);
    } catch (error) {
      console.error("Failed to fetch revenue metrics:", error);
    } finally {
      setLoading((prev) => ({ ...prev, revenue: false }));
    }
  };

  const fetchSubscriptions = async () => {
    setLoading((prev) => ({ ...prev, subscriptions: true }));
    try {
      const data = await apiCache.fetch(
        "/api/metrics/stripe-subscriptions",
        CACHE_DURATION_MS
      );

      // Detectar si bajó una suscripción
      const currentSubscriptionCount = data.active_count || 0;
      if (
        previousSubscriptionCount > 0 &&
        currentSubscriptionCount < previousSubscriptionCount
      ) {
        playFailSound();
      }

      setPreviousSubscriptionCount(currentSubscriptionCount);
      setSubscriptions(data);
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
    } finally {
      setLoading((prev) => ({ ...prev, subscriptions: false }));
    }
  };

  const fetchAllMetrics = async () => {
    await Promise.allSettled([
      fetchActiveUsers(),
      fetchRegisteredUsers(),
      fetchPageViews(),
      fetchTransactions(),
      fetchRevenueMetrics(),
      fetchSubscriptions(),
    ]);

    setLastUpdated(new Date());
  };

  useEffect(() => {
    // Initial fetch
    fetchAllMetrics();

    // Habilitar audio automáticamente
    enableAudio();

    // Todas las métricas se actualizan cada 5 minutos
    const generalInterval = setInterval(
      () => {
        fetchActiveUsers();
        fetchRegisteredUsers();
        fetchPageViews();
        fetchTransactions();
        fetchRevenueMetrics();
        fetchSubscriptions();
        setLastUpdated(new Date());
      },
      5 * 60 * 1000 // 5 minutos
    );

    return () => {
      clearInterval(generalInterval);
    };
  }, []);

  // Verificar inactividad cada hora
  useEffect(() => {
    const checkInactivity = () => {
      const now = new Date();
      const timeSinceLastTransaction =
        now.getTime() - lastTransactionTime.getTime();
      const thirtyMinutesInMs = 30 * 60 * 1000; // 30 minutos en milisegundos

      if (timeSinceLastTransaction >= thirtyMinutesInMs && !cricketsPlayed) {
        playCricketsSound();
        setCricketsPlayed(true);
      }
    };

    // Verificar cada 30 minutos
    const inactivityInterval = setInterval(checkInactivity, 30 * 60 * 1000); // 30 minutos

    // Verificar inmediatamente al cargar
    checkInactivity();

    return () => {
      clearInterval(inactivityInterval);
    };
  }, [lastTransactionTime, cricketsPlayed]);

  const formatDateTime = (dateString: string, timeString?: string) => {
    // Parse date string in local timezone to avoid UTC conversion issues
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    // If time is available, include it
    if (timeString) {
      return `${formattedDate} • ${timeString}`;
    }

    return formattedDate;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen p-8 relative">
        {/* Logo en esquina superior izquierda */}
        <div className="absolute top-8 left-8">
          <Image
            src="/red-atlas-logo.png"
            alt="RED Atlas Logo"
            width={200}
            height={60}
            className="h-16 w-auto"
          />
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
                  value={(subscriptions?.active_count || 0) + 15}
                  loading={loading.subscriptions}
                  color="green"
                  isEuropeanFormat={true}
                  // Agregar desglose mensual/anual a la derecha
                  subtitle={
                    subscriptions
                      ? `Mensual: ${
                          subscriptions.monthly_count || 0
                        } | Anual: ${subscriptions.yearly_count || 0}`
                      : undefined
                  }
                  // Agregar aclaración de suscripciones externas
                  externalNote="15 externas"
                  goal={1000}
                />
                <MetricCard
                  title="Volumen de ventas neto"
                  value={(revenueMetrics.totalRevenue || 0) + 3000}
                  loading={loading.revenue}
                  subtitle="Últimas 4 semanas"
                  color="green"
                  isCurrency={true}
                  percentageChange={revenueMetrics.percentageChange}
                  currencyBreakdown={revenueMetrics.currencyBreakdown}
                  // Agregar aclaración de ventas externas
                  externalNote="Ventas externas: $3,000"
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
                    <div className="text-5xl font-bold text-gray-900 mb-2">
                      {formatEuropeanInteger(metrics.pageViewsYesterday)}
                    </div>
                    <div className="text-lg text-gray-700 mb-2">
                      Páginas vistas
                    </div>
                    <div className="text-sm text-gray-500 mb-4">
                      Últimos 7 días • Total:{" "}
                      {formatEuropeanInteger(
                        metrics.pageViewsByDay
                          .slice(-7)
                          .reduce((sum, day) => sum + day.views, 0)
                      )}
                    </div>

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
                            <BarChart
                              data={metrics.pageViewsByDay.slice(-7)}
                              margin={{
                                top: 30,
                                right: 10,
                                left: 10,
                                bottom: 25,
                              }}
                            >
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
                              <RechartsTooltip
                                contentStyle={{
                                  backgroundColor: "#fff",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "8px",
                                  boxShadow:
                                    "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                }}
                                labelStyle={{
                                  color: "#374151",
                                  fontWeight: "bold",
                                }}
                                formatter={(value: any, name: any) => [
                                  `${formatEuropeanInteger(
                                    parseInt(value)
                                  )} views`,
                                  "Page Views",
                                ]}
                                labelFormatter={(label: any) => {
                                  // Detectar si es HOY comparando con la fecha actual
                                  const today = new Date().toLocaleDateString(
                                    "es-ES",
                                    { day: "numeric", month: "short" }
                                  );
                                  return label === today
                                    ? `${label} (HOY - En vivo)`
                                    : `${label}`;
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
                                    fontSize: "10px",
                                    fill: "#374151",
                                    fontWeight: "600",
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
              <div
                className="bg-white rounded-2xl shadow-lg p-6 flex flex-col"
                style={{ height: "43.5rem" }}
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Últimas transacciones
                </h3>

                {loading.transactions ? (
                  <div className="space-y-3 flex-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse flex justify-between items-center py-2"
                      >
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
                    {(Array.isArray(transactions) ? transactions : [])
                      .slice(0, 7)
                      .map((transaction, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-semibold text-gray-900">
                                ${transaction.amount.toFixed(2)}{" "}
                                {transaction.currency || "USD"}
                              </div>
                              {transaction.status && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full cursor-default ${
                                        transaction.status === "succeeded"
                                          ? "bg-green-100 text-green-800"
                                          : transaction.status === "pending"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {transaction.status}
                                    </span>
                                  </TooltipTrigger>
                                  {transaction.status !== "succeeded" && (
                                    <TooltipContent side="top" align="start">
                                      <div className="text-xs max-w-xs">
                                        {transaction.failure_reason ||
                                          "No error reason available from Stripe."}
                                        {transaction.failure_code && (
                                          <div className="mt-1 text-[10px] text-gray-400">
                                            Code: {transaction.failure_code}
                                          </div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 truncate">
                              {transaction.customer_name || transaction.email}
                            </div>
                            {transaction.customer_name && (
                              <div className="text-xs text-gray-400 truncate">
                                {transaction.email}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end text-sm text-gray-500 ml-4 flex-shrink-0">
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              {transaction.coupon_name ? (
                                <div className="flex flex-col items-end">
                                  <span className="font-bold text-blue-600 text-xs">
                                    {transaction.coupon_name}
                                  </span>
                                  {transaction.amount_saved && (
                                    <span className="text-green-600 text-[10px] font-semibold">
                                      Ahorró $
                                      {transaction.amount_saved.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">
                                  Sin cupón
                                </span>
                              )}
                              <span>•</span>
                              <span>
                                {formatDateTime(
                                  transaction.date,
                                  transaction.time
                                )}
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
    </TooltipProvider>
  );
}
