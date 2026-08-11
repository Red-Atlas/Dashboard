"use client";

import { useCallback, useEffect, useState } from "react";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import TransactionsPanel from "./transactions-panel";
import { ChartCardSkeleton, MetricCardSkeleton } from "./skeletons";

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
  refunds?: {
    amount: number;
    count: number;
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
  refundNote?: string;
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
  refundNote,
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

  if (loading) return <MetricCardSkeleton />;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 relative">
      <div className={`text-5xl font-bold ${textColor} mb-2 flex items-center`}>
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
            Tasa: 1 USD = {currencyBreakdown.exchangeRate.toLocaleString()} COP
          </div>
        </div>
      )}

      {/* Refunds used to be invisible here even though they reduce the total. */}
      {refundNote && (
        <div className="text-xs text-amber-700 mt-2">{refundNote}</div>
      )}

      {subtitle && (
        <div className="text-xs text-gray-500 absolute bottom-4 right-6">
          {subtitle}
        </div>
      )}
      {externalNote && (
        <div className="text-xs text-gray-500 absolute top-4 right-6">
          {title === "Suscripciones Activas" ? `(${externalNote})` : externalNote}
        </div>
      )}
    </div>
  );
}

interface BusinessOverviewProps {
  /** Lets the panel pause the carousel while someone is searching. */
  onInteraction?: () => void;
}

export default function BusinessOverview({
  onInteraction,
}: BusinessOverviewProps) {
  const [metrics, setMetrics] = useState<BusinessMetrics>({
    activeUsers: 0,
    activeUsersPercentageChange: 0,
    registeredUsers: 0,
    pageViewsYesterday: 0,
    pageViewsByDay: [],
  });
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
    revenue: true,
    subscriptions: true,
  });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [lastTransactionTime, setLastTransactionTime] = useState<Date>(
    new Date()
  );
  const [cricketsPlayed, setCricketsPlayed] = useState<boolean>(false);
  const [previousSubscriptionCount, setPreviousSubscriptionCount] =
    useState<number>(0);

  /** Counter the transactions panel watches to re-poll on our interval. */
  const [refreshKey, setRefreshKey] = useState(0);

  // Browsers block autoplay until a gesture; playing a silent clip early makes
  // the later notification sounds more likely to be allowed through.
  const enableAudio = () => {
    const silentAudio = new Audio();
    silentAudio.volume = 0;
    silentAudio.play().catch(() => {
      // Still blocked — the sounds just won't play. Not worth surfacing.
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

  // The transactions panel owns its own fetching (it paginates and searches on
  // the server); it just tells us when something new landed so we can play the
  // sound and reset the inactivity timer.
  const handleNewTransaction = useCallback(() => {
    playNotificationSound();
    setLastTransactionTime(new Date());
    setCricketsPlayed(false);
  }, []);

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
      fetchRevenueMetrics(),
      fetchSubscriptions(),
    ]);

    setLastUpdated(new Date());
  };

  useEffect(() => {
    fetchAllMetrics();
    enableAudio();

    // Everything refreshes every 5 minutes.
    const generalInterval = setInterval(() => {
      fetchAllMetrics();
      // Nudges the transactions panel to re-poll its current page.
      setRefreshKey((key) => key + 1);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(generalInterval);
    };
    // Runs once: the interval closes over stable fetchers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                  refundNote={
                    revenueMetrics.refunds && revenueMetrics.refunds.count > 0
                      ? `↩ ${
                          revenueMetrics.refunds.count
                        } reembolso(s) por $${formatEuropeanNumber(
                          revenueMetrics.refunds.amount
                        )} ya descontados`
                      : undefined
                  }
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
              {loading.pageViews ? (
                <ChartCardSkeleton />
              ) : (
                <div className="bg-white rounded-2xl shadow-lg p-6 h-96">
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
                </div>
              )}
            </div>

            {/* Right Column - 40% width (2/5) - altura fija para coincidir */}
            <div className="col-span-2">
              <TransactionsPanel
                refreshKey={refreshKey}
                onInteraction={onInteraction}
                onNewTransaction={handleNewTransaction}
              />
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
