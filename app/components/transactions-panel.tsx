"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TransactionListSkeleton } from "./skeletons";
import type { Transaction, TransactionStatus } from "../types/transactions";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

interface StatusStyle {
  label: string;
  className: string;
}

/**
 * Stripe leaves `status: "succeeded"` on a charge even after it is refunded or
 * disputed, so the API derives a truer status and this maps it to a badge.
 */
const STATUS_STYLES: Record<TransactionStatus, StatusStyle> = {
  succeeded: { label: "exitosa", className: "bg-green-100 text-green-800" },
  refunded: { label: "reembolsada", className: "bg-amber-100 text-amber-900" },
  partially_refunded: {
    label: "reembolso parcial",
    className: "bg-amber-100 text-amber-900",
  },
  disputed: { label: "disputada", className: "bg-purple-100 text-purple-800" },
  pending: { label: "pendiente", className: "bg-yellow-100 text-yellow-800" },
  failed: { label: "fallida", className: "bg-red-100 text-red-800" },
};

interface Summary {
  windowDays: number;
  succeeded: number;
  refunded: number;
  partiallyRefunded: number;
  disputed: number;
  failed: number;
}

interface TransactionsResponse {
  data: Transaction[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: Summary;
}

function formatDateTime(dateString: string, timeString?: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const formatted = new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return timeString ? `${formatted} • ${timeString}` : formatted;
}

function StatusBadge({ transaction }: { transaction: Transaction }) {
  const style = STATUS_STYLES[transaction.status] ?? {
    label: transaction.status,
    className: "bg-gray-100 text-gray-800",
  };

  const details: string[] = [];
  if (transaction.status === "refunded") {
    details.push(
      `Reembolso total de $${transaction.amount_refunded.toFixed(2)} ${
        transaction.currency
      }`
    );
  }
  if (transaction.status === "partially_refunded") {
    details.push(
      `Reembolsado $${transaction.amount_refunded.toFixed(2)} de $${transaction.amount.toFixed(
        2
      )} ${transaction.currency}`
    );
  }
  if (transaction.refunded_at) {
    details.push(
      `Fecha del reembolso: ${new Date(
        transaction.refunded_at
      ).toLocaleDateString("es-ES")}`
    );
  }
  if (transaction.refund_reason) {
    details.push(`Motivo: ${transaction.refund_reason}`);
  }
  if (transaction.status === "disputed") {
    details.push("El cliente abrió una disputa en Stripe");
  }
  if (transaction.status === "failed") {
    details.push(
      transaction.failure_reason || "Stripe no informó un motivo de fallo."
    );
    if (transaction.failure_code) {
      details.push(`Código: ${transaction.failure_code}`);
    }
  }

  const badge = (
    <span
      className={`px-2 py-0.5 text-[11px] rounded-full cursor-default whitespace-nowrap ${style.className}`}
    >
      {style.label}
    </span>
  );

  if (details.length === 0) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="top" align="start">
        <div className="text-xs max-w-xs space-y-0.5">
          {details.map((detail, index) => (
            <div key={index}>{detail}</div>
          ))}
          <div className="text-[10px] text-gray-400 pt-1">
            Stripe: {transaction.stripe_status}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface TransactionsPanelProps {
  /** Called when the user searches or pages, so the carousel can pause. */
  onInteraction?: () => void;
  /** Bumped by the parent to force a refresh on its polling interval. */
  refreshKey?: number;
  /** Fires when a newer transaction appears, for the notification sound. */
  onNewTransaction?: (latest: Transaction) => void;
}

export default function TransactionsPanel({
  onInteraction,
  refreshKey = 0,
  onNewTransaction,
}: TransactionsPanelProps) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracks the newest transaction we've already reported, so the sound only
  // fires on genuinely new activity rather than on every poll.
  const latestSeenRef = useRef<number | null>(null);

  // Held in a ref so the fetch effect doesn't re-run when the parent passes a
  // new callback identity. Assigned in an effect, not during render.
  const onNewTransactionRef = useRef(onNewTransaction);
  useEffect(() => {
    onNewTransactionRef.current = onNewTransaction;
  }, [onNewTransaction]);

  // Debounce keystrokes so typing doesn't fire a request per character.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (query) params.set("q", query);

        const result = await fetch(
          `/api/metrics/stripe-transactions?${params}`,
          { signal: controller.signal, cache: "no-store" }
        );
        if (!result.ok) throw new Error(`HTTP ${result.status}`);

        const payload: TransactionsResponse = await result.json();
        setResponse(payload);
        setError(null);

        // Only the unfiltered first page is a reliable "newest" signal.
        const newest = payload.data[0];
        if (!query && page === 1 && newest) {
          if (
            latestSeenRef.current !== null &&
            newest.created > latestSeenRef.current
          ) {
            onNewTransactionRef.current?.(newest);
          }
          latestSeenRef.current = newest.created;
        }
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setError("No se pudieron cargar las transacciones");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [page, query, refreshKey]);

  const goToPage = useCallback(
    (next: number) => {
      onInteraction?.();
      setPage(next);
    },
    [onInteraction]
  );

  const total = response?.total ?? 0;
  const totalPages = response?.totalPages ?? 1;
  const summary = response?.summary;
  const rows = response?.data ?? [];

  // Refunds are the thing that used to be invisible, so call them out.
  const refundCount = summary
    ? summary.refunded + summary.partiallyRefunded
    : 0;

  return (
    <div
      // Tall enough for all 10 rows plus the header, search and pager, and
      // matched to the height of the left-hand column.
      className="bg-white rounded-2xl shadow-lg p-6 flex flex-col"
      style={{ height: "48.75rem" }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-2xl font-bold text-gray-900">
          Últimas transacciones
        </h3>
        <span className="text-xs text-gray-500 tabular-nums">
          {query
            ? `${total.toLocaleString("en-US")} resultado${
                total === 1 ? "" : "s"
              }`
            : `${total.toLocaleString("en-US")} en ${
                summary?.windowDays ?? 30
              } días`}
        </span>
      </div>

      {summary && (
        <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-2">
          <span className="text-green-700">{summary.succeeded} exitosas</span>
          {refundCount > 0 && (
            <>
              <span>·</span>
              <span className="text-amber-700">
                {refundCount} reembolsada{refundCount === 1 ? "" : "s"}
              </span>
            </>
          )}
          {summary.disputed > 0 && (
            <>
              <span>·</span>
              <span className="text-purple-700">
                {summary.disputed} en disputa
              </span>
            </>
          )}
          {summary.failed > 0 && (
            <>
              <span>·</span>
              <span className="text-red-700">{summary.failed} fallidas</span>
            </>
          )}
        </div>
      )}

      {/* Search runs on the server — the client never holds the full list. */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={searchInput}
          onChange={(event) => {
            onInteraction?.();
            setSearchInput(event.target.value);
          }}
          placeholder="Buscar por email, nombre, monto o estado…"
          aria-label="Buscar transacciones"
          // The native search clear button is hidden so it doesn't sit next to
          // the styled one below.
          className="w-full h-9 pl-9 pr-9 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
          >
            <X className="h-3.5 w-3.5 text-gray-400" />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading && rows.length === 0 ? (
          <TransactionListSkeleton rows={PAGE_SIZE} />
        ) : error ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm text-gray-600">
              Sin resultados{query ? ` para “${query}”` : ""}
            </p>
            {query && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div
            // Dim rather than blank the list while a new page loads.
            className={`transition-opacity ${loading ? "opacity-50" : ""}`}
          >
            {rows.map((transaction) => {
              const isReversed =
                transaction.status === "refunded" ||
                transaction.status === "disputed";

              return (
                <div
                  key={transaction.id}
                  className="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold tabular-nums ${
                          isReversed
                            ? "text-gray-400 line-through"
                            : "text-gray-900"
                        }`}
                      >
                        ${transaction.amount.toFixed(2)} {transaction.currency}
                      </span>
                      <StatusBadge transaction={transaction} />
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {transaction.customer_name || transaction.email}
                    </div>
                    {transaction.customer_name && (
                      <div className="text-[11px] text-gray-400 truncate">
                        {transaction.email}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end ml-3 flex-shrink-0 text-right">
                    <span className="text-[11px] text-gray-500 whitespace-nowrap">
                      {formatDateTime(transaction.date, transaction.time)}
                    </span>
                    {transaction.status === "partially_refunded" && (
                      <span className="text-[11px] text-amber-700 tabular-nums">
                        neto ${transaction.net_amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination: 10 per page, resolved entirely on the server. */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
        <span className="text-xs text-gray-500 tabular-nums">
          Página {response?.page ?? page} de {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            aria-label="Página anterior"
            className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goToPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
            aria-label="Página siguiente"
            className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
