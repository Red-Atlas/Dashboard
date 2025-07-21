import { getCountryData } from '@/lib/google-analytics';

export async function GET() {
  try {
    const data = await getCountryData();

    return Response.json({
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en country breakdown:', error);
    
    // Fallback en caso de error
    const mockData = [
      { country: 'Puerto Rico', users: 12000 },
      { country: 'United States', users: 11000 },
      { country: 'Netherlands', users: 178 },
      { country: 'Ireland', users: 157 },
      { country: 'Colombia', users: 102 },
      { country: 'Argentina', users: 65 },
      { country: 'India', users: 51 }
    ];

    return Response.json({
      data: mockData,
      timestamp: new Date().toISOString(),
    });
  }
} 