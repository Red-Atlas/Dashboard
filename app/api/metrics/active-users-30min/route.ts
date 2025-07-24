import { getActiveUsersComparison } from '@/lib/google-analytics';

export async function GET() {
  try {
    // Obtener usuarios activos con comparación temporal
    const comparison = await getActiveUsersComparison();
    
    return Response.json({
      value: comparison.currentUsers,
      percentageChange: comparison.percentageChange,
      previousValue: comparison.previousUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en active-users:', error);
    
    return Response.json({
      value: 0,
      percentageChange: 0,
      previousValue: 0,
      timestamp: new Date().toISOString(),
    });
  }
}
