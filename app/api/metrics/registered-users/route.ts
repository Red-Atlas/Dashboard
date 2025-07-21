import { getRegisteredUsers } from '@/lib/google-analytics';

export async function GET() {
  try {
    const value = await getRegisteredUsers();
    
    return Response.json({
      value,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en registered-users:', error);
    
    // Fallback a datos mock en caso de error
    return Response.json({
      value: Math.floor(Math.random() * 5000) + 25000,
      timestamp: new Date().toISOString(),
    });
  }
}
