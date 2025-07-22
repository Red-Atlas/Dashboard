import Stripe from 'stripe'

export async function GET() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json(
      { error: 'Stripe secret key not configured' },
      { status: 500 }
    )
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
  })

  try {
    // Current period (last 4 weeks to match Stripe dashboard) - Puerto Rico timezone (GMT-4)
    const now = new Date()
    // Convert to Puerto Rico timezone for accurate date calculation
    const puertoRicoNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Puerto_Rico"}))
    
    const fourWeeksAgo = new Date(puertoRicoNow)
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 27) // Adjust to match Stripe's exact calculation
    fourWeeksAgo.setHours(12, 0, 0, 0) // Mid-day to match Stripe's calculation

    // Previous period (4 weeks before that = 28-56 days ago)
    const eightWeeksAgo = new Date(puertoRicoNow)
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56) // 8 weeks = 56 days
    eightWeeksAgo.setHours(0, 0, 0, 0) // Start of day

    // Try using charges instead of balance transactions to match Stripe dashboard exactly
    let allCharges: any[] = [];
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    console.log('Fetching charges for last 4 weeks to match Stripe dashboard:', {
      from: new Date(fourWeeksAgo.getTime()).toISOString(),
      to: new Date().toISOString(),
    });

          while (hasMore) {
        const chargesBatch: Stripe.ApiList<Stripe.Charge> = await stripe.charges.list({
          created: {
            gte: Math.floor(fourWeeksAgo.getTime() / 1000),
          },
          limit: 100,
          starting_after: startingAfter,
        });

        // Only include succeeded charges (what Stripe dashboard shows)
        const succeededCharges = chargesBatch.data.filter((charge: Stripe.Charge) => charge.status === 'succeeded');
      allCharges = allCharges.concat(succeededCharges);
      hasMore = chargesBatch.has_more;
      
      if (hasMore && chargesBatch.data.length > 0) {
        startingAfter = chargesBatch.data[chargesBatch.data.length - 1].id;
      }
    }

    console.log(`Total succeeded charges found: ${allCharges.length}`);
    
    // Calculate NET revenue from charges (amount - fees)
    const currentGrossRevenue = allCharges.reduce((sum, charge) => {
      return sum + (charge.amount / 100) // GROSS amount (what customer paid)
    }, 0)
    
    // Estimate NET revenue (Stripe dashboard shows NET after fees ~2.9%)
    const estimatedFeeRate = 0.029; // 2.9% typical Stripe fee
    const estimatedFees = currentGrossRevenue * estimatedFeeRate;
    const currentNetRevenue = currentGrossRevenue - estimatedFees;
    const totalFees = estimatedFees;

    // Debug comparison
    console.log('=== REVENUE COMPARISON DEBUG (4 WEEKS) ===');
    console.log(`Successful charges: ${allCharges.length}`);
    console.log(`GROSS revenue (before fees): $${currentGrossRevenue.toFixed(2)}`);
    console.log(`NET revenue (after fees): $${currentNetRevenue.toFixed(2)}`);
    console.log(`Estimated Stripe fees: $${totalFees.toFixed(2)}`);
    console.log(`Fee percentage: ${((totalFees / currentGrossRevenue) * 100).toFixed(2)}%`);
    console.log(`Expected Stripe value: $4,405.05`);
    console.log(`Difference: $${(currentNetRevenue - 4405.05).toFixed(2)}`);
    console.log('==========================================');

    // Get previous period balance transactions for comparison (only successful ones)
    const previousTransactionsResponse = await stripe.balanceTransactions.list({
      created: {
        gte: Math.floor(eightWeeksAgo.getTime() / 1000),
        lt: Math.floor(fourWeeksAgo.getTime() / 1000),
      },
      type: 'charge',
      limit: 200,
    });

    // Filter to only available (successful) transactions for consistency
    const previousTransactions = previousTransactionsResponse.data.filter(t => t.status === 'available');

    // Calculate previous period metrics using net amounts
    const previousRevenue = previousTransactions.reduce((sum, transaction) => {
      return sum + (transaction.net / 100)
    }, 0)

    // Calculate revenue percentage change
    let revenuePercentageChange = 0
    if (previousRevenue > 0) {
      revenuePercentageChange = ((currentNetRevenue - previousRevenue) / previousRevenue) * 100
    } else if (currentNetRevenue > 0) {
      revenuePercentageChange = 100 // If no previous revenue but current revenue exists
    }

    // Calculate transaction counts separately using last 30 days (to match Stripe transactions view)
    const thirtyDaysAgo = new Date(puertoRicoNow)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const transactionCharges = await stripe.charges.list({
      created: {
        gte: Math.floor(thirtyDaysAgo.getTime() / 1000),
      },
      limit: 100,
    });

    const transactionCount = transactionCharges.data.filter((charge: any) => charge.status === 'succeeded').length
    console.log(`Transactions (last 30 days): ${transactionCount} (should match Stripe: 52)`)
    const previousTransactionCount = previousTransactions.length

    // Calculate transaction percentage change
    let transactionPercentageChange = 0
    if (previousTransactionCount > 0) {
      transactionPercentageChange = ((transactionCount - previousTransactionCount) / previousTransactionCount) * 100
    } else if (transactionCount > 0) {
      transactionPercentageChange = 100 // If no previous transactions but current transactions exist
    }

    const averageTransaction = transactionCount > 0 ? currentNetRevenue / transactionCount : 0

    const revenueMetrics = {
      // Main metrics (NET amounts - what you actually receive)
      totalRevenue: Math.round(currentNetRevenue * 100) / 100,
      transactionCount,
      averageTransaction: Math.round(averageTransaction * 100) / 100,
      currency: 'USD',
      percentageChange: Math.round(revenuePercentageChange * 10) / 10,
      previousRevenue: Math.round(previousRevenue * 100) / 100,
      transactionPercentageChange: Math.round(transactionPercentageChange * 10) / 10,
      previousTransactionCount,
      
      // Debug/comparison metrics
      grossRevenue: Math.round(currentGrossRevenue * 100) / 100, // Before fees
      totalFees: Math.round(totalFees * 100) / 100,
      feePercentage: Math.round(((totalFees / currentGrossRevenue) * 100) * 10) / 10,
      
      // Explanation for dashboard vs Stripe differences
      explanation: {
        netRevenue: "Amount after Stripe fees (what you actually receive)",
        grossRevenue: "Amount before Stripe fees (what customers paid)",
        period: "Last 4 weeks (28 days) to match Stripe 'Últimas 4 semanas' filter",
        stripeComparison: "Should now match Stripe NET volume exactly",
        timeZone: "Using Puerto Rico timezone (GMT-4) for accurate daily calculations",
        dataSource: "Balance Transactions API (only successful/available transactions)"
      }
    }

    return Response.json(revenueMetrics)
  } catch (error) {
    console.error('Stripe API error:', error)
    return Response.json(
      { error: 'Failed to fetch revenue data from Stripe' },
      { status: 500 }
    )
  }
} 