import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Rutas públicas (no requieren autenticación)
  const publicPaths = ['/auth/login']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // Si es una ruta pública, permitir acceso
  if (isPublicPath) {
    return NextResponse.next()
  }

  // Para rutas protegidas, la verificación se hace en el cliente
  // porque zustand persist guarda en localStorage (no accesible en middleware)
  // El layout protegido redirigirá si no está autenticado
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

