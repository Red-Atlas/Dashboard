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
    // Get recent charges (last 30 days, limit to latest 10)
    const charges = await stripe.charges.list({
      limit: 10,
    })

    // Transform Stripe charges to our transaction format
    const transactions = await Promise.all(
      charges.data.map(async (charge) => {
        let customerName = null
        let customerEmail = null

        // Get customer details if available
        if (charge.customer) {
          try {
            const customer = await stripe.customers.retrieve(charge.customer as string)
            if (typeof customer !== 'string' && !customer.deleted) {
              customerName = customer.name
              customerEmail = customer.email
            }
          } catch (error) {
            console.warn('Could not retrieve customer:', error)
          }
        }

        // Fallback to billing details if customer info not available
        if (!customerEmail && charge.billing_details?.email) {
          customerEmail = charge.billing_details.email
        }
        if (!customerName && charge.billing_details?.name) {
          customerName = charge.billing_details.name
        }

        return {
          amount: charge.amount / 100, // Convert from cents to dollars
          email: customerEmail || 'No email available',
          customer_name: customerName || null,
          date: new Date(charge.created * 1000).toISOString().split('T')[0], // Convert timestamp to YYYY-MM-DD
          currency: charge.currency.toUpperCase(),
          status: charge.status,
        }
      })
    )

    return Response.json(transactions)
  } catch (error) {
    console.error('Stripe API error:', error)
    return Response.json(
      { error: 'Failed to fetch transactions from Stripe' },
      { status: 500 }
    )
  }
}
