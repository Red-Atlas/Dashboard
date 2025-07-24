import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Reemplaza este valor por la IP pública de tu oficina
const ALLOWED_IPS = [
  '190.104.229.130', // <-- tu IP real aquí
]

export function middleware(request: NextRequest) {
  // Vercel pone la IP real en x-forwarded-for
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : undefined

  if (!ip || !ALLOWED_IPS.includes(ip)) {
    return new NextResponse('Acceso restringido', { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 