import { getPageViewsByDay } from '@/lib/google-analytics';

export async function GET() {
  try {
    const data = await getPageViewsByDay();
    
    return Response.json({
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en page-views-by-day:', error);
    
    const data = [];

    return Response.json({
      data,
      timestamp: new Date().toISOString(),
    });
  }
}
