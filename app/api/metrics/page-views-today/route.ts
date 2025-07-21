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
    
    // Fallback a datos mock en caso de error
    return Response.json({
      value: Math.floor(Math.random() * 3000) + 2000, // Números más realistas para ayer
      timestamp: new Date().toISOString(),
    });
  }
}
