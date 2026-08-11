import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const DAYS = 7;
const COP_TO_USD_RATE = 4000;
const ESTIMATED_FEE_RATE = 0.029;

/**
 * Real daily net revenue for the last 7 days.
 *
 * The previous implementation ran the same 28-day paymentIntents query once per
 * day of the loop (7 identical calls) and then returned
 * `todayTotal + random(±100)` for every point, so the whole series was
 * fabricated. This walks the charge list once and buckets by day.
 */

/** YYYY-MM-DD in the timezone the rest of the dashboard reports in. */
function puertoRicoDay(unixSeconds: number): string {
  const [month, day, year] = new Date(unixSeconds * 1000)
    .toLocaleDateString("en-US", {
      timeZone: "America/Puerto_Rico",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function label(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
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
    // Build the 7 day buckets first so days with no sales still show as 0
    // instead of silently dropping out of the chart.
    const buckets = new Map<string, number>();
    const today = new Date();
    for (let offset = DAYS - 1; offset >= 0; offset--) {
      const date = new Date(today);
      date.setDate(date.getDate() - offset);
      buckets.set(puertoRicoDay(Math.floor(date.getTime() / 1000)), 0);
    }

    const since =
      Math.floor(Date.now() / 1000) - DAYS * 24 * 60 * 60 - 24 * 60 * 60;

    const charges = await stripe.charges
      .list({ limit: 100, created: { gte: since } })
      .autoPagingToArray({ limit: 10_000 });

    for (const charge of charges) {
      if (charge.status !== "succeeded") continue;

      const day = puertoRicoDay(charge.created);
      if (!buckets.has(day)) continue;

      // Refunds come back out of the day's total.
      const captured = charge.amount - (charge.amount_refunded ?? 0);
      const currency = (charge.currency || "usd").toUpperCase();
      const amountUSD =
        currency === "COP"
          ? captured / 100 / COP_TO_USD_RATE
          : captured / 100;

      buckets.set(day, (buckets.get(day) ?? 0) + amountUSD);
    }

    const data = Array.from(buckets.entries()).map(([isoDate, gross]) => ({
      date: label(isoDate),
      // Net of the estimated Stripe fee, matching the headline card.
      value: Math.round(gross * (1 - ESTIMATED_FEE_RATE) * 100) / 100,
      fullDate: isoDate,
    }));

    return NextResponse.json(
      { data, timestamp: new Date().toISOString() },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Error en stripe-revenue-history:", error);
    return NextResponse.json(
      { data: [], error: "Failed to fetch revenue history" },
      { status: 502 }
    );
  }
}
