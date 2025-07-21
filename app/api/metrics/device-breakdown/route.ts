import { getOperatingSystemData } from '@/lib/google-analytics';

export async function GET() {
  try {
    const data = await getOperatingSystemData();

    return Response.json({
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en operating system breakdown:', error);
    
    // Fallback en caso de error
    const mockData = [
      { os: 'Windows', users: 11000 },
      { os: 'iOS', users: 6500 },
      { os: 'Android', users: 5700 },
      { os: 'Macintosh', users: 392 },
      { os: 'Linux', users: 119 },
      { os: 'Chrome OS', users: 62 }
    ];

    return Response.json({
      data: mockData,
      timestamp: new Date().toISOString(),
    });
  }
} 