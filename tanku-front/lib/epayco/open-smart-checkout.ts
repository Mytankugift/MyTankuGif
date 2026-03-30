/**
 * Abre ePayco Smart Checkout (checkout-v2.js) con un sessionId obtenido del backend.
 */
export function openEpaycoSmartCheckout(sessionId: string): void {
  if (typeof window === 'undefined') {
    throw new Error('openEpaycoSmartCheckout solo en cliente')
  }
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
    throw new Error('ePayco no está cargado. Por favor, recarga la página.')
  }

  const test = process.env.NEXT_PUBLIC_EPAYCO_TEST_MODE !== 'false'
  const checkout = w.ePayco.checkout.configure({
    sessionId,
    type: 'onpage',
    test,
  })

  checkout.onClosed?.(() => {
    console.log('[EPAYCO-SMART] Checkout cerrado')
  })
  checkout.onErrors?.((errors) => {
    console.error('[EPAYCO-SMART] Errores:', errors)
  })

  checkout.open()
}
