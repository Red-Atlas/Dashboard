"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { apiCache } from "@/app/utils/apiCache";
import { CACHE_DURATION_MS } from "@/app/config/cache";
import { Skeleton } from "@/components/ui/skeleton";

interface MarketCount {
  pri: number;
  col: number;
}

interface AtlasData {
  parcels: MarketCount;
  listings: MarketCount;
  transactions: MarketCount;
  news: number;
  users: (MarketCount & { externalPayments: number }) | null;
  source: "public" | "admin";
  fetchedAt: string;
}

const formatNumber = (value: number) =>
  value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const formatMarkets = (counts: MarketCount | undefined) =>
  `PR: ${formatNumber(counts?.pri ?? 0)} | COL: ${formatNumber(
    counts?.col ?? 0
  )}`;

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

function MetricCard({
  title,
  value,
  subtitle,
  color = "#3b82f6",
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="mb-2">
        <span className="text-3xl font-bold" style={{ color }}>
          {typeof value === "number" ? formatNumber(value) : value}
        </span>
      </div>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>
      <Skeleton className="h-9 w-48 mb-3" />
      <Skeleton className="h-4 w-full max-w-xs" />
    </div>
  );
}

function Shell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle: React.ReactNode;
}) {
  return (
    <div className="min-h-screen p-8 relative bg-gray-50">
      <div className="absolute top-8 left-8">
        <Image
          src="/red-atlas-logo.png"
          alt="RED Atlas"
          width={200}
          height={60}
          className="h-16 w-auto"
          priority
        />
      </div>
      <div className="absolute top-8 right-8 text-right">
        <p className="text-xl text-gray-600">Base de Datos Red Atlas</p>
      </div>
      <div className="mt-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Datos de la Base de Datos
            </h1>
            <p className="text-lg text-gray-600">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function RedAtlasDB() {
  const [data, setData] = useState<AtlasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await apiCache.fetch("/api/atlas-data", CACHE_DURATION_MS);
      if (result?.error) throw new Error(result.detail || result.error);
      setData(result as AtlasData);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo conectar a la base de datos"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Shell subtitle="Cargando información…">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <MetricCardSkeleton key={index} />
          ))}
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell subtitle="No se pudo conectar a la base de datos">
        <div className="max-w-xl mx-auto text-center bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-red-600 mb-2">
            Error de conexión
          </h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              apiCache.invalidate("/api/atlas-data");
              load();
            }}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Reintentar
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell subtitle="Información en tiempo real de Red Atlas">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <MetricCard
          title="Parcelas"
          value={formatMarkets(data?.parcels)}
          subtitle="Parcelas registradas en Puerto Rico y Colombia"
          color="#10b981"
        />
        <MetricCard
          title="Listings"
          value={formatMarkets(data?.listings)}
          subtitle="Propiedades listadas en Puerto Rico y Colombia"
          color="#3b82f6"
        />
        <MetricCard
          title="Transacciones"
          value={formatMarkets(data?.transactions)}
          subtitle="Transacciones inmobiliarias registradas"
          color="#8b5cf6"
        />
        <MetricCard
          title="Noticias"
          value={data?.news ?? 0}
          subtitle="Artículos de noticias en la plataforma"
          color="#f59e0b"
        />

        {/*
          Only present when ATLAS_API_TOKEN is configured — the public Atlas
          endpoint does not expose user counts.
        */}
        {data?.users && (
          <MetricCard
            title="Usuarios"
            value={formatMarkets(data.users)}
            subtitle={`Total de usuarios registrados • Pagos externos: ${formatNumber(
              data.users.externalPayments
            )}`}
            color="#ef4444"
          />
        )}
      </div>
    </Shell>
  );
}
