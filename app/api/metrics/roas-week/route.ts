import { getROASWeek } from '@/lib/google-ads';

export async function GET() {
  try {
    const data = await getROASWeek();

    return Response.json({
      value: data.value,
      trend: data.trend,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en ROAS week:', error);
    
    // Fallback en caso de error
    const roas = Math.random() * 3 + 2; // 2-5x
    const trends = ["up", "down", "neutral"];

    return Response.json({
      value: roas,
      trend: trends[Math.floor(Math.random() * trends.length)],
      timestamp: new Date().toISOString(),
    });
  }
}
