import axios from 'axios'

/**
 * Extrae mensaje legible desde errores Axios (formato ERP con `error: { message }` o legacy `error` string).
 */
export function extractApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return (
        err.message ||
        'Sin respuesta del servidor. ¿Backend encendido, NEXT_PUBLIC_API_URL correcta y origen ERP permitido en CORS_ORIGINS?'
      )
    }

    const d = err.response.data as Record<string, unknown> | undefined
    if (!d || typeof d !== 'object') {
      return `Error HTTP ${err.response.status}`
    }

    const e = d.error
    if (typeof e === 'string') return e
    if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
      return (e as { message: string }).message
    }
    const top = d.message
    if (typeof top === 'string') return top
    return err.response.status >= 400 ? `Error HTTP ${err.response.status}` : err.message || 'Error de API'
  }

  return err instanceof Error ? err.message : 'Error desconocido'
}
