import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  AnalyticsEventType,
  IncomingEvent,
  INGEST_LIMITS,
  isAllowedEventType,
} from './analytics-events.types';

/** Recorta un string a un largo máximo (o null). */
function clampString(value: unknown, max = INGEST_LIMITS.MAX_STRING_LEN): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/** Serializa metadata de forma segura y la descarta si excede el tope de tamaño. */
function sanitizeMetadata(metadata: unknown): Prisma.InputJsonValue | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }
  try {
    const json = JSON.stringify(metadata);
    if (json.length > INGEST_LIMITS.MAX_METADATA_BYTES) return undefined;
    return JSON.parse(json) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

export class AnalyticsEventsService {
  /**
   * Inserta un lote de eventos (append-only). Filtra eventos inválidos en vez de
   * fallar: la telemetría no debe romper la app. Devuelve cuántos se aceptaron.
   */
  async ingestBatch(
    events: IncomingEvent[],
    context: { userId?: string | null; sessionId?: string | null },
  ): Promise<number> {
    if (!Array.isArray(events) || events.length === 0) return 0;

    const sessionId = clampString(context.sessionId);
    const userId = context.userId ?? null;

    const rows = events
      .slice(0, INGEST_LIMITS.MAX_EVENTS_PER_REQUEST)
      .filter((e) => e && isAllowedEventType(e.eventType))
      .map((e) => ({
        eventType: e.eventType,
        userId,
        sessionId,
        entityType: clampString(e.entityType),
        entityId: clampString(e.entityId),
        metadata: sanitizeMetadata(e.metadata),
      }));

    if (rows.length === 0) return 0;

    await prisma.analyticsEvent.createMany({ data: rows });
    return rows.length;
  }

  /**
   * Registra un evento generado en el servidor (p. ej. `purchase` al confirmar el
   * pago). Append-only y defensivo: la telemetría NUNCA debe romper el flujo que
   * la dispara, así que cualquier error se traga y se loguea.
   */
  async recordServerEvent(event: {
    eventType: AnalyticsEventType;
    userId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      await prisma.analyticsEvent.create({
        data: {
          eventType: event.eventType,
          userId: event.userId ?? null,
          sessionId: null,
          entityType: clampString(event.entityType),
          entityId: clampString(event.entityId),
          metadata: sanitizeMetadata(event.metadata),
        },
      });
    } catch (err) {
      console.error('[analytics] recordServerEvent failed:', err);
    }
  }
}

/** Instancia compartida para emitir eventos desde otros módulos del backend. */
export const analyticsEventsService = new AnalyticsEventsService();
