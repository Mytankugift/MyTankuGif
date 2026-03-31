/**
 * URLs remotas (https/http) no deben pasar por el optimizador de Vercel (`/_next/image`)
 * para no consumir el cupo de Image Transformations. El CDN (p. ej. CloudFront) ya sirve el archivo.
 * Rutas locales (`/...`) pueden seguir usando el pipeline por defecto.
 */
export function isRemoteImageSrc(src: string | undefined | null): boolean {
  if (!src || typeof src !== 'string') return false
  return src.startsWith('http://') || src.startsWith('https://')
}
