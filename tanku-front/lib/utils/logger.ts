/**
 * Logger utility para controlar logs en desarrollo vs producción
 * Evita logs innecesarios en producción mejorando performance
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args)
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args)
  },
  error: (...args: any[]) => {
    // Errores siempre se muestran, pero puedes agregar tracking aquí
    console.error(...args)
    // TODO: Agregar Sentry, LogRocket, etc. aquí si es necesario
  },
  api: (message: string, data?: any) => {
    if (isDev) {
      console.log(`[API] ${message}`, data || '')
    }
  },
  info: (...args: any[]) => {
    if (isDev) console.info(...args)
  },
}

