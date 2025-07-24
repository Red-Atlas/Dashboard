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
    
    return Response.json({
      value: 0,
      timestamp: new Date().toISOString(),
    });
  }
}
