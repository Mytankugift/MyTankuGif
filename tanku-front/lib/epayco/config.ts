/**
 * ePayco: modo classic (checkout.js) vs smart (Apify + checkout-v2.js).
 * Por defecto: Smart. Solo checkout clásico si NEXT_PUBLIC_EPAYCO_CHECKOUT_MODE=classic
 */
export function isEpaycoSmartMode(): boolean {
  const mode = (process.env.NEXT_PUBLIC_EPAYCO_CHECKOUT_MODE || '').trim().toLowerCase()
  return mode !== 'classic'
}

export function getEpaycoClassicScriptUrl(): string {
  return process.env.NEXT_PUBLIC_EPAYCO_CHECKOUT_URL || 'https://checkout.epayco.co/checkout.js'
}

export function getEpaycoSmartScriptUrl(): string {
  return process.env.NEXT_PUBLIC_EPAYCO_SMART_SCRIPT || 'https://checkout.epayco.co/checkout-v2.js'
}

export function getEpaycoScriptUrlForMode(): string {
  return isEpaycoSmartMode() ? getEpaycoSmartScriptUrl() : getEpaycoClassicScriptUrl()
}
