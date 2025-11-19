"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface GoalsData {
  registeredUsers: number;
  paidSubscriptions: number;
  pageViews: number;
  netRevenue: number;
}

interface GoalCardProps {
  title: string;
  current: number;
  target: number;
  format?: "number" | "currency" | "percentage";
  color?: "red" | "green" | "blue";
}

function GoalCard({
  title,
  current,
  target,
  format = "number",
  color = "green",
}: GoalCardProps) {
  const percentage = Math.min((current / target) * 100, 100);

  const getColorClasses = () => {
    switch (color) {
      case "red":
        return {
          bg: "bg-red-100",
          progress: "bg-red-500",
          text: "text-red-600",
        };
      case "blue":
        return {
          bg: "bg-blue-100",
          progress: "bg-blue-500",
          text: "text-blue-600",
        };
      default:
        return {
          bg: "bg-green-100",
          progress: "bg-green-500",
          text: "text-green-600",
        };
    }
  };

  const formatValue = (value: number) => {
    switch (format) {
      case "currency":
        return `$${value.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}`;
      case "percentage":
        return `${value.toLocaleString("en-US")}%`;
      default:
        return value.toLocaleString("en-US");
    }
  };

  const colorClasses = getColorClasses();

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${colorClasses.text}`}>
              {formatValue(current)}
            </span>
            <span className="text-sm text-gray-500">
              / {formatValue(target)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${colorClasses.text}`}>
            {percentage.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">Completado</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        className={`w-full h-3 ${colorClasses.bg} rounded-full overflow-hidden`}
      >
        <div
          className={`h-full ${colorClasses.progress} transition-all duration-1000 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Progress Details */}
      <div className="flex justify-between items-center mt-3 text-sm">
        <span className="text-gray-600">
          {formatValue(current)} de {formatValue(target)}
        </span>
        <span className="text-gray-500">
          Faltan {formatValue(target - current)}
        </span>
      </div>
    </div>
  );
}

export default function GoalsScreen() {
  const [goalsData, setGoalsData] = useState<GoalsData>({
    registeredUsers: 0,
    paidSubscriptions: 0,
    pageViews: 0,
    netRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchGoalsData = async () => {
    setLoading(true);
    try {
      const [atlasData, subscriptions, pageViews, revenue] = await Promise.all([
        fetch("/api/atlas-data").then((r) => r.json()),
        fetch("/api/metrics/stripe-subscriptions").then((r) => r.json()),
        fetch("/api/metrics/page-views-by-hour").then((r) => r.json()),
        fetch("/api/metrics/stripe-revenue").then((r) => r.json()),
      ]);

      // Calculate total page views from the last 7 days
      const totalPageViews =
        pageViews.data
          ?.slice(-7)
          .reduce((sum: number, day: any) => sum + day.views, 0) || 0;

      // Calculate total registered users from Atlas DB (PR + COL)
      const totalRegisteredUsers =
        (atlasData.data?.users?.pri || 0) + (atlasData.data?.users?.col || 0);

      setGoalsData({
        registeredUsers: totalRegisteredUsers,
        paidSubscriptions:
          (subscriptions.active_count || 0) +
          (atlasData.data?.users?.externalPayments || 0), // Including external subscriptions
        pageViews: totalPageViews,
        netRevenue: (revenue.totalRevenue || 0) + 3000, // Including external revenue
      });
    } catch (error) {
      console.error("Failed to fetch goals data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchGoalsData();

      // Refresh every 5 minutes
      const interval = setInterval(fetchGoalsData, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [mounted]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen p-8 relative bg-gray-50">
        {/* Logo */}
        <div className="absolute top-8 left-8">
          <Image
            src="/red-atlas-logo.png"
            alt="RED Atlas Logo"
            width={200}
            height={60}
            className="h-16 w-auto"
          />
        </div>

        {/* Loading Content */}
        <div className="mt-24">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-lg p-6 animate-pulse"
                >
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 relative bg-gray-50">
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <Image
          src="/red-atlas-logo.png"
          alt="RED Atlas Logo"
          width={200}
          height={60}
          className="h-16 w-auto"
        />
      </div>

      {/* Content */}
      <div className="mt-24">
        <div className="max-w-6xl mx-auto">
          {/* Main Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Metas para el 31 de Diciembre
            </h1>
            <p className="text-lg text-gray-600">Objetivos del negocio 2025</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <GoalCard
              title="Usuarios Registrados"
              current={goalsData.registeredUsers}
              target={42000}
              format="number"
              color="blue"
            />

            <GoalCard
              title="Suscripciones Pagas"
              current={goalsData.paidSubscriptions}
              target={450}
              format="number"
              color="green"
            />

            <GoalCard
              title="Page Views (7 días)"
              current={goalsData.pageViews}
              target={1000000}
              format="number"
              color="red"
            />

            <GoalCard
              title="Volumen de Ventas Neto"
              current={goalsData.netRevenue}
              target={50000}
              format="currency"
              color="green"
            />
          </div>

          {/* Summary Section */}
          <div className="mt-12 bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Resumen de Progreso
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {((goalsData.registeredUsers / 42000) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Usuarios Activos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {((goalsData.paidSubscriptions / 450) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Suscripciones</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {((goalsData.netRevenue / 50000) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Ventas Netas</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
