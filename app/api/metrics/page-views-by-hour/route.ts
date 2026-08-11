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

    return Response.json(
      {
        data: [] as Array<{ date: string; views: number; fullDate?: string }>,
        error: 'Failed to fetch page views',
        timestamp: new Date().toISOString(),
      },
      { status: 502 }
    );
  }
}
