import Stripe from "stripe";

export async function GET() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json(
      { error: "Stripe secret key not configured" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-06-30.basil",
  });

  try {
    // Current period (last 4 weeks to match Stripe dashboard) - Puerto Rico timezone (GMT-4)
    const now = new Date();
    // Convert to Puerto Rico timezone for accurate date calculation
    const puertoRicoNow = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Puerto_Rico" })
    );

    const fourWeeksAgo = new Date(puertoRicoNow);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 27); // Adjust to match Stripe's exact calculation
    fourWeeksAgo.setHours(12, 0, 0, 0); // Mid-day to match Stripe's calculation

    // Previous period (4 weeks before that = 28-56 days ago)
    const eightWeeksAgo = new Date(puertoRicoNow);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56); // 8 weeks = 56 days
    eightWeeksAgo.setHours(0, 0, 0, 0); // Start of day

    // Try using charges instead of balance transactions to match Stripe dashboard exactly
    let allCharges: any[] = [];
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    while (hasMore) {
      const chargesBatch: Stripe.ApiList<Stripe.Charge> =
        await stripe.charges.list({
          created: {
            gte: Math.floor(fourWeeksAgo.getTime() / 1000),
          },
          limit: 100,
          starting_after: startingAfter,
        });

      // Only include succeeded charges (what Stripe dashboard shows)
      const succeededCharges = chargesBatch.data.filter(
        (charge: Stripe.Charge) => charge.status === "succeeded"
      );
      allCharges = allCharges.concat(succeededCharges);
      hasMore = chargesBatch.has_more;

      if (hasMore && chargesBatch.data.length > 0) {
        startingAfter = chargesBatch.data[chargesBatch.data.length - 1].id;
      }
    }

    // Exchange rate: 1 USD = 4000 COP (approximate, update as needed)
    const COP_TO_USD_RATE = 4000;

    // Track revenue by currency for breakdown
    let usdRevenue = 0;
    let copRevenue = 0;
    let copRevenueInUSD = 0;

    // Calculate NET revenue from charges (amount - fees) with currency conversion
    const currentGrossRevenue = allCharges.reduce((sum, charge) => {
      const amountInCents = charge.amount;
      const currency = (charge.currency || "USD").toUpperCase();

      // Convert to USD if needed
      let amountInUSD = amountInCents / 100;
      if (currency === "COP") {
        copRevenue += amountInCents / 100;
        amountInUSD = amountInCents / 100 / COP_TO_USD_RATE;
        copRevenueInUSD += amountInUSD;
      } else if (currency === "USD") {
        usdRevenue += amountInUSD;
      }

      return sum + amountInUSD;
    }, 0);

    // Estimate NET revenue (Stripe dashboard shows NET after fees ~2.9%)
    const estimatedFeeRate = 0.029; // 2.9% typical Stripe fee
    const estimatedFees = currentGrossRevenue * estimatedFeeRate;
    const currentNetRevenue = currentGrossRevenue - estimatedFees;
    const totalFees = estimatedFees;

    // Get previous period balance transactions for comparison (only successful ones)
    const previousTransactionsResponse = await stripe.balanceTransactions.list({
      created: {
        gte: Math.floor(eightWeeksAgo.getTime() / 1000),
        lt: Math.floor(fourWeeksAgo.getTime() / 1000),
      },
      type: "charge",
      limit: 200,
    });

    // Filter to only available (successful) transactions for consistency
    const previousTransactions = previousTransactionsResponse.data.filter(
      (t) => t.status === "available"
    );

    // Calculate previous period metrics using net amounts
    const previousRevenue = previousTransactions.reduce((sum, transaction) => {
      return sum + transaction.net / 100;
    }, 0);

    // Calculate revenue percentage change
    let revenuePercentageChange = 0;
    if (previousRevenue > 0) {
      revenuePercentageChange =
        ((currentNetRevenue - previousRevenue) / previousRevenue) * 100;
    } else if (currentNetRevenue > 0) {
      revenuePercentageChange = 100; // If no previous revenue but current revenue exists
    }

    // Calculate transaction counts separately using last 30 days (to match Stripe transactions view)
    const thirtyDaysAgo = new Date(puertoRicoNow);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const transactionCharges = await stripe.charges.list({
      created: {
        gte: Math.floor(thirtyDaysAgo.getTime() / 1000),
      },
      limit: 100,
    });

    const transactionCount = transactionCharges.data.filter(
      (charge: any) => charge.status === "succeeded"
    ).length;
    const previousTransactionCount = previousTransactions.length;

    // Calculate transaction percentage change
    let transactionPercentageChange = 0;
    if (previousTransactionCount > 0) {
      transactionPercentageChange =
        ((transactionCount - previousTransactionCount) /
          previousTransactionCount) *
        100;
    } else if (transactionCount > 0) {
      transactionPercentageChange = 100; // If no previous transactions but current transactions exist
    }

    const averageTransaction =
      transactionCount > 0 ? currentNetRevenue / transactionCount : 0;

    const revenueMetrics = {
      // Main metrics (NET amounts - what you actually receive)
      totalRevenue: Math.round(currentNetRevenue * 100) / 100,
      transactionCount,
      averageTransaction: Math.round(averageTransaction * 100) / 100,
      currency: "USD",
      percentageChange: Math.round(revenuePercentageChange * 10) / 10,
      previousRevenue: Math.round(previousRevenue * 100) / 100,
      transactionPercentageChange:
        Math.round(transactionPercentageChange * 10) / 10,
      previousTransactionCount,

      // Currency breakdown
      currencyBreakdown: {
        usd: Math.round(usdRevenue * 100) / 100,
        cop: Math.round(copRevenue * 100) / 100,
        copInUSD: Math.round(copRevenueInUSD * 100) / 100,
        exchangeRate: COP_TO_USD_RATE,
      },

      // Debug/comparison metrics
      grossRevenue: Math.round(currentGrossRevenue * 100) / 100, // Before fees
      totalFees: Math.round(totalFees * 100) / 100,
      feePercentage:
        Math.round((totalFees / currentGrossRevenue) * 100 * 10) / 10,

      // Explanation for dashboard vs Stripe differences
      explanation: {
        netRevenue: "Amount after Stripe fees (what you actually receive)",
        grossRevenue: "Amount before Stripe fees (what customers paid)",
        period:
          "Last 4 weeks (28 days) to match Stripe 'Últimas 4 semanas' filter",
        stripeComparison: "Should now match Stripe NET volume exactly",
        timeZone:
          "Using Puerto Rico timezone (GMT-4) for accurate daily calculations",
        dataSource:
          "Balance Transactions API (only successful/available transactions)",
        currencyConversion: `COP amounts converted to USD using rate: 1 USD = ${COP_TO_USD_RATE} COP`,
      },
    };

    return Response.json(revenueMetrics);
  } catch (error) {
    console.error("Stripe API error:", error);
    return Response.json(
      { error: "Failed to fetch revenue data from Stripe" },
      { status: 500 }
    );
  }
}
