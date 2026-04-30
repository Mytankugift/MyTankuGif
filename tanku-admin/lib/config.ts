// Normalizar URL: quitar barra final si existe
const normalizeUrl = (url: string): string => {
  return url.replace(/\/$/, '')
}

/** Dominio público de la app (CTA del correo, etc.). Jamás usar localhost aquí dentro de mails. */
export const publicSiteUrl = normalizeUrl(process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || 'https://www.mytanku.com')

/** Carpeta `/email` en el front deployado donde viven PNG/JPEG del correo. */
export const emailPublicAssetsBase = normalizeUrl(
  process.env.NEXT_PUBLIC_EMAIL_PUBLIC_ASSETS_BASE || `${publicSiteUrl}/email`
)

export const config = {
  apiUrl: normalizeUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'),
  isProduction: process.env.NEXT_PUBLIC_API_URL?.includes('https://') || false,
}

// Log de configuración en desarrollo
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔧 Configuración API:', {
    apiUrl: config.apiUrl,
    isProduction: config.isProduction,
    envVar: process.env.NEXT_PUBLIC_API_URL,
    publicSiteUrl,
    emailPublicAssetsBase,
  })
}

