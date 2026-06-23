/**
 * Logger utility para controlar logs en desarrollo vs producción
 * Evita logs innecesarios en producción mejorando performance
 */

const isDev = process.env.NODE_ENV === 'development'

// Logs de alta frecuencia (peticiones API, eventos de socket, paginación de feed)
// quedan apagados por defecto incluso en dev para mantener la consola en mínimos.
// Actívalos con NEXT_PUBLIC_VERBOSE_LOGS=true en .env.local cuando necesites depurar.
const isVerbose = isDev && process.env.NEXT_PUBLIC_VERBOSE_LOGS === 'true'

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args)
  },
  /**
   * Logs ruidosos de depuración (por petición/evento). Solo en dev + flag verbose.
   * Úsalo en lugar de console.log para trazas que se repiten muchas veces.
   */
  debug: (...args: any[]) => {
    if (isVerbose) console.log(...args)
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
    if (isVerbose) {
      console.log(`[API] ${message}`, data ?? '')
    }
  },
  info: (...args: any[]) => {
    if (isDev) console.info(...args)
  },
}

