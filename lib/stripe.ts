import Stripe from "stripe";

/**
 * Single place the Stripe API version is pinned. It used to be repeated across
 * six routes, two of which were still on 2023-10-16.
 *
 * Verified against the live account: charge `refunded` / `amount_refunded` /
 * `disputed`, refund and customer expansion, balance transactions and
 * subscription price intervals all behave the same as on the previous version.
 */
export const STRIPE_API_VERSION = "2026-07-29.dahlia" as const;

let client: Stripe | null = null;

/** Returns null when the key isn't configured, so routes can 500 cleanly. */
export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
    });
  }
  return client;
}

/**
 * Every subscription on the account, cached.
 *
 * The account has ~800 subscriptions, so walking the list costs ~6s across 9
 * pages. Both /stripe-subscriptions and /stripe-subscriptions-history need the
 * same data and were each paying that separately on every dashboard refresh.
 */
const SUBSCRIPTIONS_TTL_MS = 5 * 60 * 1000;

let subscriptionsCache: {
  subscriptions: Stripe.Subscription[];
  fetchedAt: number;
} | null = null;
let subscriptionsInFlight: Promise<Stripe.Subscription[]> | null = null;

export async function getAllSubscriptions(
  stripe: Stripe
): Promise<Stripe.Subscription[]> {
  if (
    subscriptionsCache &&
    Date.now() - subscriptionsCache.fetchedAt < SUBSCRIPTIONS_TTL_MS
  ) {
    return subscriptionsCache.subscriptions;
  }

  // Concurrent callers share one upstream walk instead of racing.
  if (!subscriptionsInFlight) {
    subscriptionsInFlight = stripe.subscriptions
      // Deliberately not expanding data.customer: on ~800 subscriptions that
      // roughly doubles the walk time, and only the 5 most recent ever need
      // customer details (fetched separately).
      .list({ status: "all", limit: 100 })
      .autoPagingToArray({ limit: 10_000 })
      .then((subscriptions) => {
        subscriptionsCache = { subscriptions, fetchedAt: Date.now() };
        return subscriptions;
      })
      .finally(() => {
        subscriptionsInFlight = null;
      });
  }

  try {
    return await subscriptionsInFlight;
  } catch (error) {
    if (subscriptionsCache) return subscriptionsCache.subscriptions;
    throw error;
  }
}
