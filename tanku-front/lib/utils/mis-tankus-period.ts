/**
 * Rango de años disponibles en Mis TANKUS (no se listan años anteriores).
 */
export const MIS_TANKUS_MIN_YEAR = 2026

export type MisTankusPeriodOption = {
  value: string
  label: string
}

/**
 * Opciones: últimos 30 días, últimos 3 meses, y cada año desde {@link MIS_TANKUS_MIN_YEAR}
 * hasta el año calendario actual (se amplía solo en años futuros).
 */
export function buildMisTankusPeriodOptions(now: Date = new Date()): MisTankusPeriodOption[] {
  const calendarYear = now.getFullYear()
  const endYear = Math.max(calendarYear, MIS_TANKUS_MIN_YEAR)

  const years: MisTankusPeriodOption[] = []
  for (let y = MIS_TANKUS_MIN_YEAR; y <= endYear; y++) {
    years.push({ value: `year:${y}`, label: `Año ${y} · calendario` })
  }

  return [
    { value: '30d', label: 'Tiempo reciente · 30 días' },
    { value: '3m', label: 'Últimos 3 meses' },
    ...years,
  ]
}

export function getMisTankusPeriodRange(
  value: string,
  now: Date = new Date()
): { start: Date; end: Date } {
  const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  if (value === '30d') {
    const start = new Date(now)
    start.setDate(start.getDate() - 30)
    start.setHours(0, 0, 0, 0)
    return { start, end: endDay }
  }

  if (value === '3m') {
    const start = new Date(now)
    start.setMonth(start.getMonth() - 3)
    start.setHours(0, 0, 0, 0)
    return { start, end: endDay }
  }

  const yMatch = /^year:(\d{4})$/.exec(value)
  if (yMatch) {
    let y = parseInt(yMatch[1], 10)
    if (Number.isNaN(y)) {
      const start = new Date(now)
      start.setDate(start.getDate() - 30)
      start.setHours(0, 0, 0, 0)
      return { start, end: endDay }
    }
    y = Math.max(y, MIS_TANKUS_MIN_YEAR)
    const start = new Date(y, 0, 1, 0, 0, 0, 0)
    const end = new Date(y, 11, 31, 23, 59, 59, 999)
    return { start, end }
  }

  const start = new Date(now)
  start.setDate(start.getDate() - 30)
  start.setHours(0, 0, 0, 0)
  return { start, end: endDay }
}

export function isDateInRange(isoDate: string, range: { start: Date; end: Date }): boolean {
  const d = new Date(isoDate)
  return d >= range.start && d <= range.end
}
