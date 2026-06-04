/** Prefijo E.164 Colombia */
export const COLOMBIA_PHONE_PREFIX = '+57'

const NATIONAL_LENGTH = 10

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Normaliza a +57 + 10 dígitos móvil (empieza en 3). Devuelve null si no es válido.
 */
export function normalizeColombiaPhone(input: string | null | undefined): string | null {
  if (!input?.trim()) return null
  let digits = digitsOnly(input)
  if (digits.startsWith('57') && digits.length >= 12) {
    digits = digits.slice(2)
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1)
  }
  if (digits.length !== NATIONAL_LENGTH || !digits.startsWith('3')) {
    return null
  }
  return `${COLOMBIA_PHONE_PREFIX}${digits}`
}

export function isValidColombiaPhone(input: string | null | undefined): boolean {
  return normalizeColombiaPhone(input) !== null
}

/** Solo los 10 dígitos nacionales para el input (sin +57), incluye borradores incompletos. */
export function nationalDigitsFromStored(stored: string | null | undefined): string {
  if (!stored?.trim()) return ''
  const normalized = normalizeColombiaPhone(stored)
  if (normalized) return normalized.slice(COLOMBIA_PHONE_PREFIX.length)
  let d = digitsOnly(stored)
  if (d.startsWith('57')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return d.slice(0, NATIONAL_LENGTH)
}

export function maskColombiaPhone(stored: string | null | undefined): string {
  const normalized = normalizeColombiaPhone(stored)
  if (!normalized) return '—'
  const national = normalized.slice(COLOMBIA_PHONE_PREFIX.length)
  const last4 = national.slice(-4)
  return `${COLOMBIA_PHONE_PREFIX} ******${last4}`
}

export function formatColombiaPhoneDisplay(stored: string | null | undefined): string {
  const normalized = normalizeColombiaPhone(stored)
  if (!normalized) return ''
  const n = normalized.slice(COLOMBIA_PHONE_PREFIX.length)
  return `${COLOMBIA_PHONE_PREFIX} ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
}

export function clampNationalPhoneInput(raw: string): string {
  return digitsOnly(raw).slice(0, NATIONAL_LENGTH)
}
