import type Stripe from "stripe";
import { getAllSubscriptions, getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const stripe = getStripe();
  if (!stripe) {
    return Response.json(
      { error: "Stripe secret key not configured" },
      { status: 500 }
    );
  }

  try {
    // One shared, cached walk of the subscription list — this route and
    // /stripe-subscriptions-history were each paginating ~800 subscriptions
    // separately on every refresh (~6s apiece).
    const all = await getAllSubscriptions(stripe);

    const activeSubscriptions = all.filter((sub) => sub.status === "active");

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const canceledLastMonth = all.filter(
      (sub) =>
        sub.status === "canceled" &&
        (sub.ended_at ?? sub.canceled_at ?? 0) >= thirtyDaysAgo
    );

    const totalActive = activeSubscriptions.length;
    const totalCanceled = canceledLastMonth.length;
    const churnRate =
      totalActive > 0
        ? (totalCanceled / (totalActive + totalCanceled)) * 100
        : 0;

    // MRR in USD, with yearly plans amortised over 12 months. COP-priced
    // plans have to be converted or they swamp the total (a 59,900 COP plan
    // is ~$15, not $59,900).
    const COP_TO_USD_RATE = 4000;
    const toUSD = (cents: number, currency: string) =>
      currency.toUpperCase() === "COP"
        ? cents / 100 / COP_TO_USD_RATE
        : cents / 100;

    let mrr = 0;
    let monthlyCount = 0;
    let yearlyCount = 0;

    for (const sub of activeSubscriptions) {
      const price = sub.items.data[0]?.price;
      const amountUSD = toUSD(price?.unit_amount || 0, price?.currency || "usd");

      if (price?.recurring?.interval === "month") {
        mrr += amountUSD;
        monthlyCount++;
      } else if (price?.recurring?.interval === "year") {
        mrr += amountUSD / 12;
        yearlyCount++;
      }
    }

    // Five most recent subscriptions, newest first. Customer details are
    // expanded only for these, not for the whole cached list.
    const latest = await stripe.subscriptions.list({
      limit: 5,
      expand: ["data.customer"],
    });

    const formattedSubscriptions = latest.data.map((sub) => {
      const customer =
        sub.customer && typeof sub.customer !== "string"
          ? (sub.customer as Stripe.Customer)
          : null;

      return {
        id: sub.id,
        customer_name: customer?.name || "Unknown",
        customer_email: customer?.email || "",
        amount: (sub.items.data[0]?.price?.unit_amount || 0) / 100,
        currency: sub.items.data[0]?.price?.currency || "usd",
        status: sub.status,
        created: new Date(sub.created * 1000).toISOString(),
        product_name: sub.items.data[0]?.price?.nickname || "Subscription",
      };
    });

    return Response.json({
      active_count: totalActive,
      monthly_count: monthlyCount,
      yearly_count: yearlyCount,
      churn_rate: Number(churnRate.toFixed(2)),
      mrr: Number(mrr.toFixed(2)),
      latest_subscriptions: formattedSubscriptions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching Stripe subscriptions:", error);

    // This used to return randomised numbers and fake customer names, which
    // looked like real data on the dashboard. Fail visibly instead.
    return Response.json(
      { error: "Failed to fetch subscriptions from Stripe" },
      { status: 502 }
    );
  }
}
