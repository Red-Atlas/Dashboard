import { getActiveUsers7Days } from '@/lib/google-analytics';

export async function GET() {
  try {
    const data = await getActiveUsers7Days();
    
    return Response.json({
      value: data.value,
      previousValue: data.previousValue,
      percentageChange: data.percentageChange,
      trend: data.trend,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en active users 7 días:', error);
    
    return Response.json({
      value: 0,
      previousValue: 0,
      percentageChange: 0,
      trend: 'neutral',
      timestamp: new Date().toISOString(),
    });
  }
} 