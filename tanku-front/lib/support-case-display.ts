import type { SupportCaseEventDTO, SupportCaseStatus } from '@/types/api'

const STATUS_LABELS: Record<SupportCaseStatus, string> = {
  OPEN: 'Pendiente',
  IN_REVIEW: 'En revisión',
  WAITING_USER: 'En revisión',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
}

function isClosedStatusTransition(event: SupportCaseEventDTO): boolean {
  if (event.kind !== 'STATUS_CHANGED' || !event.payload) return false
  const from = event.payload.from as string | undefined
  const to = event.payload.to as string | undefined
  return from === 'CLOSED' || to === 'CLOSED'
}

const USER_VISIBLE_KINDS = new Set([
  'CREATED',
  'STATUS_CHANGED',
  'PUBLIC_MESSAGE',
  'USER_MESSAGE',
])

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Tu reporte inicial',
  STATUS_CHANGED: 'Actualización de estado',
  PUBLIC_MESSAGE: 'Respuesta de soporte',
  USER_MESSAGE: 'Tu respuesta',
}

export type TimelineMessageRole = 'user' | 'support'

export const TIMELINE_ROLE_LABELS: Record<TimelineMessageRole, string> = {
  user: 'Tú',
  support: 'Soporte',
}

/** Rol del mensaje en el historial (null si no es mensaje). */
export function timelineMessageRole(event: SupportCaseEventDTO): TimelineMessageRole | null {
  if (event.kind === 'USER_MESSAGE' || event.kind === 'CREATED') return 'user'
  if (event.kind === 'PUBLIC_MESSAGE') return 'support'
  return null
}

export function supportCaseEventTitle(kind: string): string {
  return EVENT_LABELS[kind] ?? 'Actualización'
}

export function renderSupportCaseEventBody(event: SupportCaseEventDTO): string | null {
  const payload = event.payload
  if (!payload) return null

  if (event.kind === 'STATUS_CHANGED') {
    const from = payload.from as string | undefined
    const to = payload.to as string | undefined
    if (from && to) {
      const fromLabel = STATUS_LABELS[from as SupportCaseStatus] ?? from
      const toLabel = STATUS_LABELS[to as SupportCaseStatus] ?? to
      return `${fromLabel} → ${toLabel}`
    }
  }

  if (event.kind === 'CREATED' && typeof payload.description === 'string') {
    return payload.description
  }

  if (event.kind === 'PUBLIC_MESSAGE' && typeof payload.message === 'string') {
    return payload.message
  }

  if (event.kind === 'USER_MESSAGE' && typeof payload.message === 'string') {
    return payload.message
  }

  return null
}

const MESSAGE_KINDS = new Set(['PUBLIC_MESSAGE', 'USER_MESSAGE', 'CREATED'])

/** ID del mensaje más reciente (público o del usuario), si existe. */
export function latestUserTimelineMessageId(
  events: SupportCaseEventDTO[]
): string | null {
  const messages = events
    .filter((e) => USER_VISIBLE_KINDS.has(e.kind) && MESSAGE_KINDS.has(e.kind))
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  return messages[0]?.id ?? null
}

/** Eventos visibles al usuario, del más reciente al más antiguo. */
export function eventsForUserTimeline(
  events: SupportCaseEventDTO[],
  fallbackInitial?: { caseId: string; description: string; createdAt: string }
): SupportCaseEventDTO[] {
  const filtered = events
    .filter((e) => USER_VISIBLE_KINDS.has(e.kind) && !isClosedStatusTransition(e))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (!fallbackInitial) return filtered
  if (filtered.some((e) => e.kind === 'CREATED')) return filtered

  return [
    ...filtered,
    {
      id: `${fallbackInitial.caseId}-initial-report`,
      kind: 'CREATED',
      payload: { description: fallbackInitial.description },
      actorType: 'USER',
      actorId: null,
      createdAt: fallbackInitial.createdAt,
    },
  ]
}
