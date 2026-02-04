// Normalizar URL: quitar barra final si existe
const normalizeUrl = (url: string): string => {
  return url.replace(/\/$/, '')
}

export const config = {
  apiUrl: normalizeUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'),
  isProduction: process.env.NEXT_PUBLIC_API_URL?.includes('https://') || false,
}

// Log de configuración en desarrollo
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔧 Configuración API:', {
    apiUrl: config.apiUrl,
    isProduction: config.isProduction,
    envVar: process.env.NEXT_PUBLIC_API_URL,
  })
}

