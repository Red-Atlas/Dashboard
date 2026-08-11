import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared loading placeholders. Each one mirrors the size and rhythm of the
 * content it stands in for, so the layout doesn't jump when data lands.
 */

export function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* Matches the 5xl value line. */}
      <Skeleton className="h-12 w-40 mb-3" />
      <Skeleton className="h-5 w-28" />
    </div>
  );
}

export function MetricGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <MetricCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ChartCardSkeleton({ className = "h-96" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      <Skeleton className="h-12 w-32 mb-3" />
      <Skeleton className="h-5 w-40 mb-2" />
      <Skeleton className="h-4 w-56 mb-6" />
      <div className="flex items-end gap-3 h-40">
        {/* Staggered heights read as a bar chart rather than a grey block. */}
        {[45, 70, 55, 85, 60, 95, 75].map((height, index) => (
          <Skeleton
            key={index}
            className="flex-1 rounded-t-sm"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="ml-4 flex flex-col items-end gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function TransactionListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="flex-1" aria-busy="true" aria-label="Cargando transacciones">
      {Array.from({ length: rows }).map((_, index) => (
        <TransactionRowSkeleton key={index} />
      ))}
    </div>
  );
}

export function ScreenSkeleton({ title }: { title?: string }) {
  return (
    <div className="min-h-screen p-8" aria-busy="true">
      <div className="flex items-start justify-between mb-16">
        <Skeleton className="h-16 w-48" />
        <Skeleton className="h-6 w-40" />
      </div>
      {title ? (
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{title}</h1>
          <Skeleton className="h-5 w-64 mx-auto" />
        </div>
      ) : null}
      <div className="grid grid-cols-5 gap-8">
        <div className="col-span-3 space-y-6">
          <MetricGridSkeleton />
          <ChartCardSkeleton />
        </div>
        <div className="col-span-2">
          <div
            className="bg-white rounded-2xl shadow-lg p-6"
            style={{ height: "48.75rem" }}
          >
            <Skeleton className="h-8 w-56 mb-6" />
            <TransactionListSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
