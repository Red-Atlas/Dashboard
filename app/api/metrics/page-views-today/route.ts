import { getPageViewsYesterday } from '@/lib/google-analytics';

export async function GET() {
  try {
    const value = await getPageViewsYesterday();
    
    return Response.json({
      value,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en page-views-yesterday:', error);
    
    return Response.json({
      value: 0,
      timestamp: new Date().toISOString(),
    });
  }
}
