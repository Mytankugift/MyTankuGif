/**
 * Zona horaria unificada para el cron de recordatorios y la lógica de "hoy".
 * Por defecto America/Bogota; sobreescribible con EVENT_REMINDERS_CRON_TZ.
 */

import { startOfDay } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

const DEFAULT_TZ = 'America/Bogota';

export function getEventRemindersTimeZone(): string {
  const raw = process.env.EVENT_REMINDERS_CRON_TZ?.trim();
  return raw || DEFAULT_TZ;
}

/** Inicio del día civil en `timeZone`, como instante UTC. */
export function startOfZonedDay(date: Date, timeZone: string): Date {
  const zoned = toZonedTime(date, timeZone);
  const sod = startOfDay(zoned);
  return fromZonedTime(sod, timeZone);
}

export function zonedDayBoundsUtc(
  date: Date,
  timeZone: string,
): { start: Date; end: Date } {
  const start = startOfZonedDay(date, timeZone);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function calendarMonthYearInZone(
  date: Date,
  timeZone: string,
): { year: number; month: number } {
  const y = formatInTimeZone(date, timeZone, 'yyyy');
  const m = formatInTimeZone(date, timeZone, 'MM');
  return { year: parseInt(y, 10), month: parseInt(m, 10) };
}

export function addCalendarMonth(
  year: number,
  month: number,
): { year: number; month: number } {
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  return { year: nextYear, month: nextMonth };
}
