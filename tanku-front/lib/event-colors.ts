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

export function toDateInputValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dateInputToApiPayload(yyyyMmDd: string): string {
  return yyyyMmDd.slice(0, 10)
}
