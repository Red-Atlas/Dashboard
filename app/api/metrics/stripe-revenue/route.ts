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
    // Current month (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Previous month (30-60 days ago)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    // Get charges for both periods
    const [currentCharges, previousCharges] = await Promise.all([
      // Current month charges
      stripe.charges.list({
        created: {
          gte: Math.floor(thirtyDaysAgo.getTime() / 1000),
        },
        limit: 100,
      }),
      // Previous month charges
      stripe.charges.list({
        created: {
          gte: Math.floor(sixtyDaysAgo.getTime() / 1000),
          lt: Math.floor(thirtyDaysAgo.getTime() / 1000),
        },
        limit: 100,
      })
    ])

    // Calculate current month metrics
    const currentSuccessfulCharges = currentCharges.data.filter(charge => charge.status === 'succeeded')
    const currentRevenue = currentSuccessfulCharges.reduce((sum, charge) => {
      return sum + (charge.amount / 100)
    }, 0)

    // Calculate previous month metrics
    const previousSuccessfulCharges = previousCharges.data.filter(charge => charge.status === 'succeeded')
    const previousRevenue = previousSuccessfulCharges.reduce((sum, charge) => {
      return sum + (charge.amount / 100)
    }, 0)

    // Calculate revenue percentage change
    let revenuePercentageChange = 0
    if (previousRevenue > 0) {
      revenuePercentageChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100
    } else if (currentRevenue > 0) {
      revenuePercentageChange = 100 // If no previous revenue but current revenue exists
    }

    // Calculate transaction counts
    const transactionCount = currentSuccessfulCharges.length
    const previousTransactionCount = previousSuccessfulCharges.length

    // Calculate transaction percentage change
    let transactionPercentageChange = 0
    if (previousTransactionCount > 0) {
      transactionPercentageChange = ((transactionCount - previousTransactionCount) / previousTransactionCount) * 100
    } else if (transactionCount > 0) {
      transactionPercentageChange = 100 // If no previous transactions but current transactions exist
    }

    const averageTransaction = transactionCount > 0 ? currentRevenue / transactionCount : 0

    const revenueMetrics = {
      totalRevenue: Math.round(currentRevenue * 100) / 100,
      transactionCount,
      averageTransaction: Math.round(averageTransaction * 100) / 100,
      currency: 'USD',
      percentageChange: Math.round(revenuePercentageChange * 10) / 10, // Revenue change
      previousRevenue: Math.round(previousRevenue * 100) / 100,
      transactionPercentageChange: Math.round(transactionPercentageChange * 10) / 10, // Transaction change
      previousTransactionCount,
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