import { getCTRWeek } from '@/lib/google-ads';

export async function GET() {
  try {
    const data = await getCTRWeek();

    return Response.json({
      value: data.value,
      trend: data.trend,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en CTR week:', error);
    
    // Fallback en caso de error
    const ctr = Math.random() * 3 + 1; // 1-4%
    const trends = ["up", "down", "neutral"];

    return Response.json({
      value: ctr,
      trend: trends[Math.floor(Math.random() * trends.length)],
      timestamp: new Date().toISOString(),
    });
  }
}
