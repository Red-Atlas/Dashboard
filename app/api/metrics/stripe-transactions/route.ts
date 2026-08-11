import type Stripe from "stripe";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Transaction, TransactionStatus } from "@/app/types/transactions";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/** How long the fetched Stripe window is reused to serve pages/searches. */
const WINDOW_TTL_MS = 60 * 1000;

/**
 * A charge that has been refunded keeps `status: "succeeded"` in Stripe
 * forever — the refund lives on separate fields. Reading `status` alone is why
 * refunded payments were still showing up as "succeeded" in the dashboard.
 *
 * Precedence: a dispute is the most severe outcome, then a full refund, then a
 * partial one, and only an untouched successful charge stays "succeeded".
 */
function deriveStatus(charge: Stripe.Charge): TransactionStatus {
  if (charge.status === "failed") return "failed";
  if (charge.status === "pending") return "pending";

  if (charge.disputed) return "disputed";
  if (charge.refunded) return "refunded";
  if ((charge.amount_refunded ?? 0) > 0) return "partially_refunded";

  return "succeeded";
}

function formatInPuertoRico(created: number) {
  const utc = new Date(created * 1000);

  const [month, day, year] = utc
    .toLocaleDateString("en-US", {
      timeZone: "America/Puerto_Rico",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/");

  return {
    date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    time: utc.toLocaleTimeString("en-US", {
      timeZone: "America/Puerto_Rico",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

function toTransaction(charge: Stripe.Charge): Transaction {
  const { date, time } = formatInPuertoRico(charge.created);

  const customer =
    charge.customer && typeof charge.customer !== "string"
      ? (charge.customer as Stripe.Customer)
      : null;

  const customerEmail =
    (customer && !customer.deleted ? customer.email : null) ??
    charge.billing_details?.email ??
    null;

  const customerName =
    (customer && !customer.deleted ? customer.name : null) ??
    charge.billing_details?.name ??
    null;

  // `refunds` is expanded on the list call, so no extra round trip per charge.
  const refunds = charge.refunds?.data ?? [];
  const latestRefund = refunds.length
    ? refunds.reduce((latest, refund) =>
        refund.created > latest.created ? refund : latest
      )
    : null;

  const amount = charge.amount / 100;
  const amountRefunded = (charge.amount_refunded ?? 0) / 100;

  return {
    id: charge.id,
    amount,
    amount_refunded: amountRefunded,
    net_amount: Math.round((amount - amountRefunded) * 100) / 100,
    email: customerEmail || "No email available",
    customer_name: customerName || null,
    date,
    time,
    created: charge.created,
    currency: charge.currency.toUpperCase(),
    status: deriveStatus(charge),
    stripe_status: charge.status,
    refunded_at: latestRefund
      ? new Date(latestRefund.created * 1000).toISOString()
      : null,
    refund_reason: latestRefund?.reason ?? null,
    dispute_status: charge.disputed ? "disputed" : null,
    // Discount data lives on the invoice, which the current restricted Stripe
    // key cannot read (needs `invoice_read` + `coupon_read`). Left null rather
    // than silently swallowing a permission error on every single charge.
    coupon_name: null,
    amount_saved: null,
    failure_reason:
      charge.failure_message ||
      charge.outcome?.seller_message ||
      charge.outcome?.reason ||
      null,
    failure_code: charge.failure_code || null,
  };
}

/**
 * Stripe's charge search API supports neither email nor name as a query field,
 * so search has to happen on our side. To keep that cheap we fetch the 30-day
 * window once, cache it briefly, and serve every page and query from it —
 * the client only ever receives one page.
 */
let cache: { transactions: Transaction[]; fetchedAt: number } | null = null;
let inFlight: Promise<Transaction[]> | null = null;

async function fetchWindow(stripe: Stripe): Promise<Transaction[]> {
  const since = Math.floor(Date.now() / 1000) - WINDOW_DAYS * 24 * 60 * 60;

  const transactions: Transaction[] = [];
  let startingAfter: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const batch: Stripe.ApiList<Stripe.Charge> = await stripe.charges.list({
      limit: 100,
      created: { gte: since },
      starting_after: startingAfter,
      // Expanding here replaces the previous per-charge customer lookup,
      // which cost one extra API call for every row on the screen.
      expand: ["data.customer", "data.refunds"],
    });

    transactions.push(...batch.data.map(toTransaction));
    hasMore = batch.has_more;
    startingAfter = batch.data.at(-1)?.id;
    if (!startingAfter) break;
  }

  transactions.sort((a, b) => b.created - a.created);
  return transactions;
}

async function getWindow(stripe: Stripe): Promise<Transaction[]> {
  if (cache && Date.now() - cache.fetchedAt < WINDOW_TTL_MS) {
    return cache.transactions;
  }

  // Collapse concurrent misses into a single upstream fetch.
  if (!inFlight) {
    inFlight = fetchWindow(stripe)
      .then((transactions) => {
        cache = { transactions, fetchedAt: Date.now() };
        return transactions;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  try {
    return await inFlight;
  } catch (error) {
    // Serve a stale window rather than an error screen if we have one.
    if (cache) return cache.transactions;
    throw error;
  }
}

/**
 * The badges are in Spanish, so searching "reembolsada" has to work as well as
 * searching the underlying English status.
 */
const STATUS_SEARCH_TERMS: Record<TransactionStatus, string> = {
  succeeded: "exitosa exitosas aprobada",
  refunded: "reembolsada reembolso devuelta",
  partially_refunded: "reembolso parcial parcialmente reembolsada",
  disputed: "disputada disputa contracargo",
  pending: "pendiente",
  failed: "fallida fallidas rechazada error",
};

function matches(transaction: Transaction, query: string): boolean {
  const haystack = [
    transaction.email,
    transaction.customer_name,
    transaction.status,
    STATUS_SEARCH_TERMS[transaction.status],
    transaction.currency,
    transaction.amount.toFixed(2),
    transaction.date,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Every term must appear somewhere, so "49 refunded" narrows as expected.
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export async function GET(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe secret key not configured" },
      { status: 500 }
    );
  }

  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").trim();
  const statusFilter = (params.get("status") ?? "").trim();
  const pageSize = Math.min(
    Math.max(Number(params.get("limit")) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );

  try {
    const all = await getWindow(stripe);

    let filtered = all;
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }
    if (query) {
      filtered = filtered.filter((t) => matches(t, query));
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    // Clamp so a stale page number (e.g. after searching) still returns rows.
    const page = Math.min(
      Math.max(Number(params.get("page")) || 1, 1),
      totalPages
    );
    const start = (page - 1) * pageSize;

    return NextResponse.json(
      {
        data: filtered.slice(start, start + pageSize),
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
        // Counts across the whole window, so the header stays stable while
        // the user pages through or searches.
        summary: {
          windowDays: WINDOW_DAYS,
          succeeded: all.filter((t) => t.status === "succeeded").length,
          refunded: all.filter((t) => t.status === "refunded").length,
          partiallyRefunded: all.filter(
            (t) => t.status === "partially_refunded"
          ).length,
          disputed: all.filter((t) => t.status === "disputed").length,
          failed: all.filter((t) => t.status === "failed").length,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Stripe transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions from Stripe" },
      { status: 502 }
    );
  }
}
