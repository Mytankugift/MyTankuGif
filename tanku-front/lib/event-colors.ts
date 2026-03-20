/** Tipos de evento por color (preset + cualquier hex personalizado guardado en BD) */
export const EVENT_COLOR_PRESETS = [
  { key: 'general', label: 'General', hex: '#73FFA2' },
  { key: 'personal', label: 'Personal', hex: '#66DEDB' },
  { key: 'trabajo', label: 'Trabajo', hex: '#A78BFA' },
  { key: 'salud', label: 'Salud', hex: '#F472B6' },
  { key: 'social', label: 'Social', hex: '#FBBF24' },
  { key: 'importante', label: 'Importante', hex: '#F87171' },
] as const

export const DEFAULT_EVENT_COLOR = '#73FFA2'

export function normalizeEventColor(hex: string | undefined | null): string {
  if (!hex || typeof hex !== 'string') return DEFAULT_EVENT_COLOR
  const h = hex.trim()
  return /^#[0-9A-Fa-f]{6}$/.test(h) ? h : DEFAULT_EVENT_COLOR
}

/** Día civil según UTC (API guarda mediodía UTC). */
export function toDateInputValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return todayDateInputValue()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** “Hoy” según el calendario local del dispositivo (coincide con lo que el usuario ve en la fecha del sistema). */
export function todayDateInputValue(): string {
  const t = new Date()
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const day = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dateInputToApiPayload(yyyyMmDd: string): string {
  return yyyyMmDd.slice(0, 10)
}
