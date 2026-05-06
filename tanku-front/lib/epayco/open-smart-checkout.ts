/**
 * Abre ePayco Smart Checkout (checkout-v2.js) con un sessionId obtenido del backend.
 */

function logSmart(prefix: string, ...args: unknown[]) {
  console.log(`[EPAYCO-SMART]${prefix}`, ...args)
}

function stringifyEpaycoPayload(errors: unknown): string {
  if (errors == null) return String(errors)
  if (typeof errors === 'string') return errors
  if (errors instanceof Error) return `${errors.name}: ${errors.message}`
  try {
    return JSON.stringify(errors, null, 2)
  } catch {
    try {
      return Object.prototype.toString.call(errors)
    } catch {
      return '[no serializable]'
    }
  }
}

/**
 * @param sessionId - sessionId devuelto por POST /checkout/epayco-smart-session
 * @param flow - etiqueta para logs (cart, gift, gift_direct, stalker_gift)
 * @param testFromApi - si viene del backend, alinea logs y opcionalmente el flag test del widget
 */
export function openEpaycoSmartCheckout(
  sessionId: string,
  flow = 'checkout',
  testFromApi?: boolean
): void {
  const prefix = `[${flow}]`
  const stamp = () => new Date().toISOString()

  if (typeof window === 'undefined') {
    throw new Error('openEpaycoSmartCheckout solo en cliente')
  }

  logSmart(`${prefix}`, stamp(), 'Iniciando apertura Smart Checkout')

  const w = window as Window & {
    ePayco?: {
      checkout: {
        configure: (config: {
          sessionId: string
          type: 'onpage' | 'standard'
          test: boolean
        }) => {
          open: () => void
          onCreated?: (cb: () => void) => void
          onErrors?: (cb: (errors: unknown) => void) => void
          onClosed?: (cb: () => void) => void
        }
      }
    }
  }

  if (!w.ePayco?.checkout) {
    console.error(`[EPAYCO-SMART]${prefix}`, stamp(), 'window.ePayco.checkout no está definido (¿checkout-v2.js cargado?)')
    throw new Error('ePayco no está cargado. Por favor, recarga la página.')
  }

  const testFromEnv = process.env.NEXT_PUBLIC_EPAYCO_TEST_MODE !== 'false'
  const test = typeof testFromApi === 'boolean' ? testFromApi : testFromEnv

  logSmart(`${prefix}`, 'sessionId (prefijo):', sessionId?.slice(0, 12) + '…', 'longitud:', sessionId?.length ?? 0)
  logSmart(`${prefix}`, 'test (widget):', test, '| env NEXT_PUBLIC_EPAYCO_TEST_MODE:', testFromEnv, '| desde API:', testFromApi ?? '(no enviado)')

  logSmart(`${prefix}`, 'configure() …')
  const checkout = w.ePayco.checkout.configure({
    sessionId,
    type: 'onpage',
    test,
  })

  logSmart(`${prefix}`, 'Handler tras configure:',
    'onCreated' in checkout && typeof checkout.onCreated === 'function' ? 'sí' : 'no expuesto',
    '| onErrors:',
    'onErrors' in checkout && typeof checkout.onErrors === 'function' ? 'sí' : 'no expuesto',
    '| onClosed:',
    'onClosed' in checkout && typeof checkout.onClosed === 'function' ? 'sí' : 'no expuesto')

  checkout.onClosed?.(() => {
    logSmart(`${prefix}`, stamp(), 'onClosed — el usuario cerró el checkout (pagó o canceló)')
  })

  checkout.onCreated?.(() => {
    logSmart(`${prefix}`, stamp(), 'onCreated — el Smart Checkout informó creación EXITOSA')
  })

  if (typeof checkout.onCreated !== 'function') {
    logSmart(`${prefix}`, '⚠ Este SDK no expone onCreated(); no verás ese evento aunque el checkout funcione.')
  }

  checkout.onErrors?.((errors) => {
    console.error(`[EPAYCO-SMART]${prefix}`, stamp(), 'onErrors — error desde el checkout de ePayco:')
    console.error(`[EPAYCO-SMART]${prefix}`, 'tipo:', typeof errors, '| stringify:', stringifyEpaycoPayload(errors))
    console.error(`[EPAYCO-SMART]${prefix}`, 'valor crudo:', errors)
  })

  if (typeof checkout.onErrors !== 'function') {
    console.warn(`[EPAYCO-SMART]${prefix}`, '⚠ Este SDK no expone onErrors(); los fallos solo podrían verse en la UI del iframe o en Network.')
  }

  try {
    logSmart(`${prefix}`, stamp(), 'open() …')
    checkout.open()
    logSmart(`${prefix}`, stamp(), 'open() retornó (sin throw). Si la UI está vacía, revisa cuenta ePayco, modo test o pestaña Network.')
  } catch (e) {
    console.error(`[EPAYCO-SMART]${prefix}`, stamp(), 'open() lanzó excepción:', e)
    throw e
  }
}
