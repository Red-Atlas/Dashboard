"use client"

import React, { useEffect, useState } from 'react';
import Image from "next/image"

interface AtlasData {
  data: {
    parcels: {
      pri: number;
      col: number;
    };
    listings: {
      pri: number;
      col: number;
    };
    users: {
      pri: number;
      col: number;
      externalPayments: number;
    };
    dataSources: {
      byType: Array<{
        key: string;
        doc_count: number;
      }>;
    };
    coupons: any;
  };
  errors: any[];
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  loading: boolean;
  color?: string;
}

// Helper function for number formatting
const formatNumber = (val: number) => {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

function MetricCard({ title, value, subtitle, loading, color = "#3b82f6" }: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: color }}
        ></div>
      </div>
      
      <div className="mb-2">
        <span 
          className="text-3xl font-bold"
          style={{ color: color }}
        >
          {typeof value === 'number' ? formatNumber(value) : value}
        </span>
      </div>
      
      {subtitle && (
        <p className="text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}

const RedAtlasDB = () => {
  const [data, setData] = useState<AtlasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const fetchData = async () => {
        try {
          const response = await fetch('/api/atlas-data');
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          const result: AtlasData = await response.json();
          setData(result);
        } catch (error: any) {
          setError(error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [mounted]);

  if (error) {
    return (
      <div className="min-h-screen p-8 relative bg-gray-50">
        <div className="absolute top-8 left-8">
          <Image src="/red-atlas-logo.png" alt="RED Atlas Logo" width={200} height={60} className="h-16 w-auto" />
        </div>
        <div className="mt-24 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error de Conexión</h1>
            <p className="text-gray-600">No se pudo conectar a la base de datos</p>
            <p className="text-sm text-gray-500 mt-2">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get news count from dataSources
  const newsCount = data?.data?.dataSources?.byType?.find(item => item.key === "News")?.doc_count || 0;

  if (!mounted || loading) {
    return (
      <div className="min-h-screen p-8 relative bg-gray-50">
        <div className="absolute top-8 left-8">
          <Image src="/red-atlas-logo.png" alt="RED Atlas Logo" width={200} height={60} className="h-16 w-auto" />
        </div>
        <div className="absolute top-8 right-8 text-right">
          <p className="text-xl text-gray-600">Base de Datos Red Atlas</p>
        </div>
        <div className="mt-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Datos de la Base de Datos</h1>
              <p className="text-lg text-gray-600">Cargando información...</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <MetricCard key={i} title="Cargando..." value="..." subtitle="..." loading={true} />
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
        <Image src="/red-atlas-logo.png" alt="RED Atlas Logo" width={200} height={60} className="h-16 w-auto" />
      </div>

      {/* Title */}
      <div className="absolute top-8 right-8 text-right">
        <p className="text-xl text-gray-600">Base de Datos Red Atlas</p>
      </div>

      {/* Content */}
      <div className="mt-24">
        <div className="max-w-7xl mx-auto">
          {/* Main Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Datos de la Base de Datos</h1>
            <p className="text-lg text-gray-600">Información en tiempo real de Red Atlas</p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Parcels Card */}
            <MetricCard
              title="Parcelas"
              value={`PR: ${data?.data?.parcels?.pri ? formatNumber(data.data.parcels.pri) : '0'} | COL: ${data?.data?.parcels?.col ? formatNumber(data.data.parcels.col) : '0'}`}
              subtitle="Parcelas registradas en Puerto Rico y Colombia"
              loading={loading}
              color="#10b981"
            />

            {/* Listings Card */}
            <MetricCard
              title="Listings"
              value={`PR: ${data?.data?.listings?.pri ? formatNumber(data.data.listings.pri) : '0'} | COL: ${data?.data?.listings?.col ? formatNumber(data.data.listings.col) : '0'}`}
              subtitle="Propiedades listadas en Puerto Rico y Colombia"
              loading={loading}
              color="#3b82f6"
            />

            {/* Users Card */}
            <MetricCard
              title="Usuarios"
              value={`PR: ${data?.data?.users?.pri ? formatNumber(data.data.users.pri) : '0'} | COL: ${data?.data?.users?.col ? formatNumber(data.data.users.col) : '0'}`}
              subtitle={`Total de usuarios registrados • Pagos externos: ${data?.data?.users?.externalPayments || 0}`}
              loading={loading}
              color="#ef4444"
            />

            {/* News Card */}
            <MetricCard
              title="Noticias"
              value={newsCount}
              subtitle="Artículos de noticias en la plataforma"
              loading={loading}
              color="#f59e0b"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedAtlasDB;
