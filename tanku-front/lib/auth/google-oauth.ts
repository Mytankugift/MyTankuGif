/**
 * OAuth Google directo. La pantalla /auth/login (correo) queda omitida temporalmente.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'

/**
 * URL del backend que inicia el flujo Google. `returnPath` es la ruta del front tras el login (pathname + query).
 */
export function getGoogleOAuthUrl(returnPath: string = '/feed'): string {
  const path = returnPath.startsWith('/') ? returnPath : `/${returnPath}`
  return `${API_BASE}/api/v1/auth/google?return_url=${encodeURIComponent(path)}`
}

/** Navegación a Google OAuth en el cliente. Sin argumento, usa la URL actual (pathname + search). */
export function startGoogleOAuth(returnPath?: string): void {
  if (typeof window === 'undefined') return
  const path =
    returnPath ?? `${window.location.pathname}${window.location.search || ''}`
  window.location.href = getGoogleOAuthUrl(path)
}
