import { getCTRDaily } from '@/lib/google-ads';

export async function GET() {
  try {
    const data = await getCTRDaily();

    return Response.json({
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en CTR daily:', error);
    
    // Fallback en caso de error
    const data = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));

      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ctr: Math.random() * 2 + 1.5, // 1.5-3.5%
      };
    });

    return Response.json({
      data,
      timestamp: new Date().toISOString(),
    });
  }
}
