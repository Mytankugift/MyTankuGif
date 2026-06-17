import { BadRequestError } from '../../../shared/errors/AppError';

/** Zona horaria de referencia para todas las agregaciones temporales. */
export const ANALYTICS_TZ = 'America/Bogota';

export type Granularity = 'day' | 'week' | 'month';

export interface ResolvedRange {
  from: Date;
  to: Date;
  granularity: Granularity;
  /** Periodo inmediatamente anterior, del mismo tamaño, para comparar deltas. */
  previous: { from: Date; to: Date };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;

function parseDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`Parámetro '${field}' no es una fecha válida`);
  }
  return date;
}

function parseGranularity(value: unknown): Granularity {
  if (value === undefined || value === null || value === '') return 'day';
  const normalized = String(value).toLowerCase();
  if (normalized === 'day' || normalized === 'week' || normalized === 'month') {
    return normalized;
  }
  throw new BadRequestError("Parámetro 'granularity' debe ser day, week o month");
}

/**
 * Resuelve el rango de fechas a partir de los query params (`from`, `to`, `granularity`).
 * Si no se entregan, usa los últimos 30 días terminando ahora.
 */
export function resolveRange(query: {
  from?: unknown;
  to?: unknown;
  granularity?: unknown;
}): ResolvedRange {
  const granularity = parseGranularity(query.granularity);

  const to = parseDate(query.to, 'to') ?? new Date();
  const from =
    parseDate(query.from, 'from') ?? new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);

  if (from.getTime() >= to.getTime()) {
    throw new BadRequestError("El parámetro 'from' debe ser anterior a 'to'");
  }

  const duration = to.getTime() - from.getTime();
  const previous = {
    from: new Date(from.getTime() - duration),
    to: new Date(from.getTime()),
  };

  return { from, to, granularity, previous };
}

/** Expresión SQL para truncar una columna UTC al bucket local (Bogotá). */
export function localBucketExpr(column: string, granularity: Granularity): string {
  return `date_trunc('${granularity}', (("${column}" AT TIME ZONE 'UTC') AT TIME ZONE '${ANALYTICS_TZ}'))`;
}

/**
 * CTE `buckets` con todos los buckets del rango (relleno de huecos para las series).
 * Usa los parámetros posicionales $1 (from) y $2 (to).
 */
export function bucketsCte(granularity: Granularity): string {
  return `buckets AS (
    SELECT generate_series(
      date_trunc('${granularity}', ($1::timestamptz AT TIME ZONE '${ANALYTICS_TZ}')),
      date_trunc('${granularity}', ($2::timestamptz AT TIME ZONE '${ANALYTICS_TZ}')),
      '1 ${granularity}'::interval
    ) AS bucket
  )`;
}

/** Calcula el porcentaje de variación entre el valor actual y el anterior. */
export function computeDelta(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null; // null = sin base de comparación
  }
  return Number((((current - previous) / previous) * 100).toFixed(2));
}
