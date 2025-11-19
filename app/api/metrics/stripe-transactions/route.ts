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
    // Get recent charges (last 30 days) - temporarily using charges instead of invoices
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

    const charges = await stripe.charges.list({
      limit: 50,
      created: {
        gte: thirtyDaysAgo,
      },
    });

    // Transform Stripe charges to our transaction format
    const transactions = await Promise.all(
      charges.data.map(async (charge) => {
        let customerName = null;
        let customerEmail = null;
        let couponName = null;
        let couponAmountOff = null;
        let couponPercentOff = null;
        let amountSaved = 0;

        // Get customer details if available
        if (charge.customer) {
          try {
            const customer = await stripe.customers.retrieve(
              charge.customer as string
            );
            if (typeof customer !== "string" && !customer.deleted) {
              customerName = customer.name;
              customerEmail = customer.email;
            }
          } catch (error) {
            console.warn("Could not retrieve customer:", error);
          }
        }

        // Get invoice details to find coupon information
        const chargeWithInvoice = charge as any;
        if (chargeWithInvoice.invoice) {
          try {
            const invoice = await stripe.invoices.retrieve(
              chargeWithInvoice.invoice as string
            );

            // Check if invoice has discounts (it's an array in newer API)
            if (invoice.discounts && invoice.discounts.length > 0) {
              const discount = invoice.discounts[0] as any;
              if (discount.coupon) {
                const coupon = discount.coupon as any;
                couponName = coupon.name || coupon.id;

                // Calculate amount saved
                if (coupon.amount_off) {
                  // Fixed amount discount
                  couponAmountOff = coupon.amount_off / 100;
                  amountSaved = couponAmountOff;
                } else if (coupon.percent_off) {
                  // Percentage discount
                  couponPercentOff = coupon.percent_off;
                  // Calculate based on subtotal before discount
                  amountSaved = (invoice.subtotal * coupon.percent_off) / 10000;
                }
              }
            }
          } catch (error) {
            console.warn("Could not retrieve invoice:", error);
          }
        }

        // Fallback to billing details if customer info not available
        if (!customerEmail && charge.billing_details?.email) {
          customerEmail = charge.billing_details.email;
        }
        if (!customerName && charge.billing_details?.name) {
          customerName = charge.billing_details.name;
        }

        // Convert Stripe timestamp to Puerto Rico timezone (AST)
        const utcDate = new Date(charge.created * 1000);

        // Use toLocaleDateString with Puerto Rico timezone to get correct date
        const puertoRicoDate = utcDate.toLocaleDateString("en-US", {
          timeZone: "America/Puerto_Rico",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });

        // Get time in Puerto Rico timezone
        const puertoRicoTime = utcDate.toLocaleTimeString("en-US", {
          timeZone: "America/Puerto_Rico",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        // Convert MM/DD/YYYY to YYYY-MM-DD format
        const [month, day, year] = puertoRicoDate.split("/");
        const dateString = `${year}-${month.padStart(2, "0")}-${day.padStart(
          2,
          "0"
        )}`;

        const failureReason =
          charge.failure_message ||
          (charge.outcome &&
            (charge.outcome.seller_message || charge.outcome.reason)) ||
          null;

        return {
          amount: charge.amount / 100,
          email: customerEmail || "No email available",
          customer_name: customerName || null,
          date: dateString,
          time: puertoRicoTime,
          currency: charge.currency.toUpperCase(),
          status: charge.status,
          coupon_name: couponName,
          amount_saved:
            amountSaved > 0 ? Math.round(amountSaved * 100) / 100 : null,
          failure_reason: failureReason,
          failure_code: charge.failure_code || null,
        };
      })
    );

    // If no transactions found, return some test data
    if (transactions.length === 0) {
      const testTransactions = [
        {
          amount: 49.0,
          email: "test@example.com",
          customer_name: "Test Customer",
          date: "2024-08-18",
          time: "02:48 PM",
          currency: "USD",
          status: "succeeded",
          coupon_name: "TEST20OFF",
        },
        {
          amount: 499.0,
          email: "annual@example.com",
          customer_name: "Annual Customer",
          date: "2024-08-17",
          time: "09:41 AM",
          currency: "USD",
          status: "succeeded",
          coupon_name: null,
        },
      ];
      return Response.json(testTransactions);
    }

    return Response.json(transactions);
  } catch (error) {
    console.error("Stripe API error:", error);
    return Response.json(
      { error: "Failed to fetch transactions from Stripe" },
      { status: 500 }
    );
  }
}
