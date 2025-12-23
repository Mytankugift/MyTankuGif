import { NextResponse } from 'next/server'

/**
 * Handler básico para /api/auth/me
 * Auth0 UserProvider intenta llamar a esta ruta automáticamente
 * Devolvemos null ya que no estamos usando Auth0 realmente
 */
export async function GET() {
  return NextResponse.json({ user: null }, { status: 200 })
}

