import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

/** Semana que empieza en domingo (Dom … Sáb), alineado con los encabezados del UI */
export const CALENDAR_WEEK_STARTS_ON = 0 as const

/**
 * Todas las celdas del calendario del mes visible: incluye días del mes anterior
 * y siguiente para completar la primera y última semana.
 */
export function getCalendarGridDays(visibleMonth: Date): Date[] {
  const monthStart = startOfMonth(visibleMonth)
  const monthEnd = endOfMonth(visibleMonth)
  const gridStart = startOfWeek(monthStart, {
    weekStartsOn: CALENDAR_WEEK_STARTS_ON,
  })
  const gridEnd = endOfWeek(monthEnd, {
    weekStartsOn: CALENDAR_WEEK_STARTS_ON,
  })
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}
