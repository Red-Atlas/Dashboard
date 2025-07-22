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
    const now = new Date()
    const puertoRicoNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Puerto_Rico"}))
    
    // OPCIÓN 1: Últimas 4 semanas (28 días) - AHORA LO QUE USA EL DASHBOARD
    const fourWeeksAgo = new Date(puertoRicoNow)
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28) // 4 semanas = 28 días
    fourWeeksAgo.setHours(0, 0, 0, 0)

    // OPCIÓN 2: Últimos 30 días (para comparación)
    const thirtyDaysAgo = new Date(puertoRicoNow)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)
    
    // OPCIÓN 3: Mes actual (desde el 1 del mes)
    const startOfCurrentMonth = new Date(puertoRicoNow.getFullYear(), puertoRicoNow.getMonth(), 1)

    // Función helper para obtener datos de un período
    const getRevenueForPeriod = async (startDate: Date, endDate?: Date) => {
      let allTransactions: Stripe.BalanceTransaction[] = [];
      let hasMore = true;
      let startingAfter: string | undefined = undefined;

      const queryParams: any = {
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
        },
        type: 'charge',
        limit: 100,
      };

      if (endDate) {
        queryParams.created.lt = Math.floor(endDate.getTime() / 1000);
      }

      while (hasMore) {
        if (startingAfter) {
          queryParams.starting_after = startingAfter;
        }

        const transactionBatch: Stripe.ApiList<Stripe.BalanceTransaction> = await stripe.balanceTransactions.list(queryParams);
        const availableTransactions = transactionBatch.data.filter((t: Stripe.BalanceTransaction) => t.status === 'available');
        allTransactions = allTransactions.concat(availableTransactions);
        hasMore = transactionBatch.has_more;
        
        if (hasMore && transactionBatch.data.length > 0) {
          startingAfter = transactionBatch.data[transactionBatch.data.length - 1].id;
        }
      }

      const grossRevenue = allTransactions.reduce((sum, t) => sum + (t.amount / 100), 0);
      const netRevenue = allTransactions.reduce((sum, t) => sum + (t.net / 100), 0);
      const totalFees = allTransactions.reduce((sum, t) => sum + (t.fee / 100), 0);

      return {
        count: allTransactions.length,
        grossRevenue,
        netRevenue,
        totalFees,
        periodStart: startDate.toISOString(),
        periodEnd: endDate ? endDate.toISOString() : now.toISOString()
      };
    };

    // Obtener datos para cada período
    const [fourWeeks, thirtyDays, currentMonth] = await Promise.all([
      getRevenueForPeriod(fourWeeksAgo),
      getRevenueForPeriod(thirtyDaysAgo),
      getRevenueForPeriod(startOfCurrentMonth)
    ]);

    return Response.json({
      timestamp: puertoRicoNow.toISOString(),
      timezone: "Puerto Rico (GMT-4)",
      
      "📊 COMPARACIÓN DE PERÍODOS": {
        
        "🎯 ÚLTIMAS 4 SEMANAS (Dashboard NUEVO)": {
          periodo: `${fourWeeksAgo.toLocaleDateString()} - ${puertoRicoNow.toLocaleDateString()}`,
          dias: "28 días",
          transacciones: fourWeeks.count,
          "volumen_bruto": `$${fourWeeks.grossRevenue.toFixed(2)}`,
          "volumen_neto": `$${fourWeeks.netRevenue.toFixed(2)}`, // DEBERÍA COINCIDIR CON STRIPE
          "fees_stripe": `$${fourWeeks.totalFees.toFixed(2)}`,
          coincidencia: fourWeeks.netRevenue.toFixed(2) === "4405.05" ? "✅ COINCIDE CON STRIPE!" : `❌ Diferencia: $${(fourWeeks.netRevenue - 4405.05).toFixed(2)}`,
          nota: "Ahora el dashboard usa este período para coincidir con Stripe"
        },
        
        "📊 ÚLTIMOS 30 DÍAS (Dashboard ANTERIOR)": {
          periodo: `${thirtyDaysAgo.toLocaleDateString()} - ${puertoRicoNow.toLocaleDateString()}`,
          dias: "30 días",
          transacciones: thirtyDays.count,
          "volumen_bruto": `$${thirtyDays.grossRevenue.toFixed(2)}`,
          "volumen_neto": `$${thirtyDays.netRevenue.toFixed(2)}`,
          "fees_stripe": `$${thirtyDays.totalFees.toFixed(2)}`,
          diferencia_vs_stripe: `$${(thirtyDays.netRevenue - 4405.05).toFixed(2)}`,
          nota: "Por esto había diferencia - 2 días extra"
        },
        
        "📅 MES ACTUAL": {
          periodo: `${startOfCurrentMonth.toLocaleDateString()} - ${puertoRicoNow.toLocaleDateString()}`,
          transacciones: currentMonth.count,
          "volumen_bruto": `$${currentMonth.grossRevenue.toFixed(2)}`,
          "volumen_neto": `$${currentMonth.netRevenue.toFixed(2)}`,
          "fees_stripe": `$${currentMonth.totalFees.toFixed(2)}`,
          nota: "Mes actual para referencia"
        }
      },
      
      "🎯 DIAGNÓSTICO FINAL": {
        "problema_original": "Dashboard mostraba $4,747 vs Stripe $4,405.05",
        "causa": "Dashboard usaba 30 días (4,747) vs Stripe 4 semanas/28 días (4,405.05)",
        "solucion": "Cambiar dashboard a 4 semanas",
        
        "dashboard_nuevo": `$${fourWeeks.netRevenue.toFixed(2)} (NET - últimas 4 semanas)`,
        "stripe_dashboard": "$4,405.05 (Stripe - últimas 4 semanas)",
        "diferencia_nueva": `$${(fourWeeks.netRevenue - 4405.05).toFixed(2)}`,
        "diferencia_anterior": `$${(thirtyDays.netRevenue - 4405.05).toFixed(2)} (con 30 días)`,
        
        "resultado": Math.abs(fourWeeks.netRevenue - 4405.05) < 1 ? "✅ PROBLEMA RESUELTO - Coinciden!" : `❌ Aún hay diferencia: $${(fourWeeks.netRevenue - 4405.05).toFixed(2)}`
      },
      
      "💡 SIGUIENTE PASO": {
        accion: "Ve a tu Stripe Dashboard y verifica:",
        verificar: [
          "¿Qué período está seleccionado? (último mes, mes actual, últimos 30 días)",
          "¿Está mostrando 'Net' o 'Gross' volume?",
          "¿Qué timezone está usando?",
          "¿Incluye transacciones pendientes?"
        ],
        solucion: "Una vez sepamos el período exacto, podemos ajustar el dashboard para que coincida"
      }
    });

  } catch (error) {
    console.error('Debug Stripe API error:', error)
    return Response.json(
      { error: 'Failed to fetch debug data from Stripe' },
      { status: 500 }
    )
  }
} 