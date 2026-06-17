/**
 * Formateo de moneda centralizado para el ERP.
 *
 * Hoy los montos vienen en pesos colombianos (COP) enteros. Cuando se normalicen
 * a decimales en el backend, este es el único lugar que habrá que ajustar.
 */
const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('es-CO')

/** Formatea un monto COP (entero) como "$ 1.234.567". */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return copFormatter.format(value)
}

/** Versión compacta para montos grandes: "$ 1,2 M". */
export function formatCurrencyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$ ${(value / 1_000_000).toFixed(1).replace('.', ',')} M`
  if (abs >= 1_000) return `$ ${(value / 1_000).toFixed(0)} K`
  return copFormatter.format(value)
}

/** Formatea un número entero con separadores de miles. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return numberFormatter.format(value)
}

/** Formatea un porcentaje con un decimal: "12,3 %". */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(1).replace('.', ',')} %`
}
