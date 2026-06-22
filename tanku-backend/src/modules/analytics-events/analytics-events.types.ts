/**
 * Tipos y validación del tracking de eventos (analytics_events).
 * Pieza compartida Analíticas Fase 3 + Inteligencia de Regalos.
 * Ver _meta/tracking-eventos.md.
 */

/** Lista cerrada de eventos permitidos (v1). Los desconocidos se descartan. */
export const ALLOWED_EVENT_TYPES = [
  'product_view',
  'product_click',
  'profile_view',
  'wishlist_view',
  'wishlist_add',
  'add_to_cart',
  'gift_cart_start',
  'purchase',
] as const;

export type AnalyticsEventType = (typeof ALLOWED_EVENT_TYPES)[number];

const ALLOWED_SET = new Set<string>(ALLOWED_EVENT_TYPES);

export function isAllowedEventType(value: unknown): value is AnalyticsEventType {
  return typeof value === 'string' && ALLOWED_SET.has(value);
}

/** Evento crudo que llega del SDK del front. */
export interface IncomingEvent {
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  /** epoch ms en cliente; informativo (se persiste created_at del servidor). */
  ts?: number;
}

/** Cuerpo del POST /api/v1/analytics/events. */
export interface IngestBody {
  sessionId?: string | null;
  events?: IncomingEvent[];
}

/** Límites defensivos: el tracking nunca debe degradar la app. */
export const INGEST_LIMITS = {
  MAX_EVENTS_PER_REQUEST: 50,
  MAX_METADATA_BYTES: 4096,
  MAX_STRING_LEN: 256,
} as const;
