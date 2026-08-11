import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Approximate COP→USD rate. Update when it drifts materially. */
const COP_TO_USD_RATE = 4000;

/** Stripe's blended card fee, used to estimate net from gross. */
const ESTIMATED_FEE_RATE = 0.029;

function toUSD(amountInCents: number, currency: string): number {
  const amount = amountInCents / 100;
  return currency.toUpperCase() === "COP" ? amount / COP_TO_USD_RATE : amount;
}

/** Walks every page — the previous version silently stopped at 100 charges. */
async function listAllCharges(
  stripe: Stripe,
  createdFilter: Stripe.ChargeListParams["created"]
): Promise<Stripe.Charge[]> {
  const charges: Stripe.Charge[] = [];
  let startingAfter: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const batch: Stripe.ApiList<Stripe.Charge> = await stripe.charges.list({
      limit: 100,
      created: createdFilter,
      starting_after: startingAfter,
    });
    charges.push(...batch.data);
    hasMore = batch.has_more;
    startingAfter = batch.data.at(-1)?.id;
    if (!startingAfter) break;
  }

  return charges;
}

export async function GET() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe secret key not configured" },
      { status: 500 }
    );
  }

  try {
    const now = new Date();
    const puertoRicoNow = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Puerto_Rico" })
    );

    // Last 4 weeks, matching Stripe's "Últimas 4 semanas" filter.
    const fourWeeksAgo = new Date(puertoRicoNow);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 27);
    fourWeeksAgo.setHours(12, 0, 0, 0);

    // The 4 weeks before that, for the comparison arrow.
    const eightWeeksAgo = new Date(puertoRicoNow);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    eightWeeksAgo.setHours(0, 0, 0, 0);

    const currentCharges = await listAllCharges(stripe, {
      gte: Math.floor(fourWeeksAgo.getTime() / 1000),
    });

    const succeeded = currentCharges.filter(
      (charge) => charge.status === "succeeded"
    );

    let usdRevenue = 0;
    let copRevenue = 0;
    let copRevenueInUSD = 0;
    let grossRevenue = 0;
    let refundedTotal = 0;

    for (const charge of succeeded) {
      const currency = (charge.currency || "usd").toUpperCase();

      // A refunded charge keeps status "succeeded" in Stripe, so the money
      // has to be taken back out here or the volume is overstated.
      const captured = charge.amount - (charge.amount_refunded ?? 0);

      const capturedUSD = toUSD(captured, currency);
      const refundedUSD = toUSD(charge.amount_refunded ?? 0, currency);

      grossRevenue += capturedUSD;
      refundedTotal += refundedUSD;

      if (currency === "COP") {
        copRevenue += captured / 100;
        copRevenueInUSD += capturedUSD;
      } else if (currency === "USD") {
        usdRevenue += capturedUSD;
      }
    }

    const totalFees = grossRevenue * ESTIMATED_FEE_RATE;
    const netRevenue = grossRevenue - totalFees;

    // Previous period, from balance transactions (already net of fees).
    // `type: "charge"` excludes refunds, so subtract them separately.
    const previousChargeList = await stripe.balanceTransactions
      .list({
        created: {
          gte: Math.floor(eightWeeksAgo.getTime() / 1000),
          lt: Math.floor(fourWeeksAgo.getTime() / 1000),
        },
        type: "charge",
        limit: 100,
      })
      .autoPagingToArray({ limit: 10_000 });

    const previousRefundList = await stripe.balanceTransactions
      .list({
        created: {
          gte: Math.floor(eightWeeksAgo.getTime() / 1000),
          lt: Math.floor(fourWeeksAgo.getTime() / 1000),
        },
        type: "refund",
        limit: 100,
      })
      .autoPagingToArray({ limit: 10_000 });

    const previousRevenue =
      previousChargeList
        .filter((entry) => entry.status === "available")
        .reduce((sum, entry) => sum + entry.net / 100, 0) +
      // Refund entries are already negative in the balance.
      previousRefundList.reduce((sum, entry) => sum + entry.net / 100, 0);

    let percentageChange = 0;
    if (previousRevenue > 0) {
      percentageChange = ((netRevenue - previousRevenue) / previousRevenue) * 100;
    } else if (netRevenue > 0) {
      percentageChange = 100;
    }

    // "Transacciones exitosas" should not count money that went back to the
    // customer, so fully refunded and disputed charges are excluded.
    const successfulCount = succeeded.filter(
      (charge) => !charge.refunded && !charge.disputed
    ).length;
    const refundedCount = succeeded.filter(
      (charge) => charge.refunded || (charge.amount_refunded ?? 0) > 0
    ).length;

    const previousTransactionCount = previousChargeList.filter(
      (entry) => entry.status === "available"
    ).length;

    let transactionPercentageChange = 0;
    if (previousTransactionCount > 0) {
      transactionPercentageChange =
        ((successfulCount - previousTransactionCount) /
          previousTransactionCount) *
        100;
    } else if (successfulCount > 0) {
      transactionPercentageChange = 100;
    }

    const round = (value: number) => Math.round(value * 100) / 100;

    return NextResponse.json(
      {
        totalRevenue: round(netRevenue),
        transactionCount: successfulCount,
        averageTransaction: round(
          successfulCount > 0 ? netRevenue / successfulCount : 0
        ),
        currency: "USD",
        percentageChange: Math.round(percentageChange * 10) / 10,
        previousRevenue: round(previousRevenue),
        transactionPercentageChange:
          Math.round(transactionPercentageChange * 10) / 10,
        previousTransactionCount,

        currencyBreakdown: {
          usd: round(usdRevenue),
          cop: round(copRevenue),
          copInUSD: round(copRevenueInUSD),
          exchangeRate: COP_TO_USD_RATE,
        },

        grossRevenue: round(grossRevenue),
        totalFees: round(totalFees),
        feePercentage:
          grossRevenue > 0
            ? Math.round(ESTIMATED_FEE_RATE * 100 * 10) / 10
            : 0,

        // Surfaced so the UI can show how much was handed back.
        refunds: {
          amount: round(refundedTotal),
          count: refundedCount,
        },

        explanation: {
          netRevenue: "Cobrado menos reembolsos, menos comisiones estimadas",
          refunds:
            "Los reembolsos se restan del cargo original (no de la fecha del reembolso)",
          period: "Últimas 4 semanas (28 días)",
          fees: `Comisión estimada de Stripe: ${(ESTIMATED_FEE_RATE * 100).toFixed(
            1
          )}%`,
          currencyConversion: `1 USD = ${COP_TO_USD_RATE} COP`,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Stripe revenue error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue data from Stripe" },
      { status: 502 }
    );
  }
}
