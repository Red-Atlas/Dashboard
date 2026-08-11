import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAllSubscriptions, getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const DAYS = 7;

/** Subscriptions handled outside Stripe, counted in the headline card too. */
const EXTERNAL_SUBSCRIPTIONS = 15;

/**
 * Active subscription count per day for the last 7 days.
 *
 * Stripe has no point-in-time "how many were active on day X" query, but it can
 * be reconstructed: a subscription was active on a given day if it started on
 * or before that day and had not yet ended. The previous implementation instead
 * fetched today's count 7 times and jittered it by ±3.
 */
function endOfDayUnix(daysAgo: number): number {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(23, 59, 59, 999);
  return Math.floor(date.getTime() / 1000);
}

function label(daysAgo: number): { date: string; fullDate: string } {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    date: date.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
    fullDate: date.toISOString().split("T")[0],
  };
}

/**
 * Statuses whose lifecycle actually reached "paying subscriber". `trialing`,
 * `incomplete` and `incomplete_expired` never did, so they are not counted —
 * which also keeps this in step with the "Suscripciones Activas" card, which
 * counts `status === "active"`.
 */
const REACHED_ACTIVE = new Set<Stripe.Subscription.Status>([
  "active",
  "canceled",
]);

function wasActiveOn(
  subscription: Stripe.Subscription,
  timestamp: number
): boolean {
  if (subscription.start_date > timestamp) return false;
  if (!REACHED_ACTIVE.has(subscription.status)) return false;

  /*
   * `ended_at` is the authoritative "stopped billing" timestamp. `canceled_at`
   * is NOT usable here: a subscription with cancel_at_period_end has
   * canceled_at set the moment cancellation is *requested* while remaining
   * active and billing until the period ends. Using it undercounted by 12.
   */
  return subscription.ended_at === null || subscription.ended_at > timestamp;
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
    // Shared cached list — see getAllSubscriptions.
    const subscriptions = await getAllSubscriptions(stripe);

    const data = [];
    for (let offset = DAYS - 1; offset >= 0; offset--) {
      const cutoff = endOfDayUnix(offset);
      const count = subscriptions.filter((subscription) =>
        wasActiveOn(subscription, cutoff)
      ).length;

      data.push({
        ...label(offset),
        value: count + EXTERNAL_SUBSCRIPTIONS,
      });
    }

    return NextResponse.json(
      { data, timestamp: new Date().toISOString() },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Error en stripe-subscriptions-history:", error);
    return NextResponse.json(
      { data: [], error: "Failed to fetch subscription history" },
      { status: 502 }
    );
  }
}
