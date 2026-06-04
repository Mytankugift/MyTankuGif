'use client'

import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  type SupportCaseEvent,
  type SupportCaseStatus,
  type SupportCaseType,
} from '@/lib/types/support-cases'

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Caso creado',
  CASE_ASSIGNED: 'Caso tomado',
  STATUS_CHANGED: 'Cambio de estado',
  PUBLIC_MESSAGE: 'Mensaje al usuario',
  USER_MESSAGE: 'Respuesta del usuario',
  INTERNAL_NOTE: 'Nota interna',
  DROPI_REFRESH: 'Actualización Dropi',
}

function eventDotClass(kind: string): string {
  switch (kind) {
    case 'INTERNAL_NOTE':
      return 'bg-amber-500 ring-amber-100'
    case 'PUBLIC_MESSAGE':
      return 'bg-sky-500 ring-sky-100'
    case 'USER_MESSAGE':
      return 'bg-violet-500 ring-violet-100'
    case 'STATUS_CHANGED':
      return 'bg-gray-500 ring-gray-100'
    case 'CASE_ASSIGNED':
      return 'bg-teal-500 ring-teal-100'
    case 'DROPI_REFRESH':
      return 'bg-indigo-500 ring-indigo-100'
    default:
      return 'bg-gray-400 ring-gray-100'
  }
}

function renderEventBody(event: SupportCaseEvent) {
  const payload = event.payload

  if (event.kind === 'STATUS_CHANGED' && payload) {
    const from = payload.from as string | undefined
    const to = payload.to as string | undefined
    if (from && to) {
      return (
        <p className="mt-2 text-sm text-gray-700">
          {CASE_STATUS_LABELS[from as SupportCaseStatus] ?? from}
          <span className="mx-2 text-gray-400">→</span>
          {CASE_STATUS_LABELS[to as SupportCaseStatus] ?? to}
        </p>
      )
    }
  }

  if (event.kind === 'CREATED' && payload) {
    const caseType = payload.caseType as SupportCaseType | undefined
    const description = payload.description as string | undefined
    const payloadAttachments = payload.attachments as Array<{ fileName?: string }> | undefined
    return (
      <div className="mt-2 space-y-1 text-sm text-gray-700">
        {caseType && (
          <p>
            <span className="text-gray-500">Motivo:</span>{' '}
            {CASE_TYPE_LABELS[caseType] ?? caseType}
          </p>
        )}
        {description && (
          <p className="whitespace-pre-wrap rounded-md bg-white/80 p-2 text-gray-800 border border-gray-100">
            {description}
          </p>
        )}
        {payloadAttachments && payloadAttachments.length > 0 && (
          <p className="text-xs text-gray-500">
            {payloadAttachments.length} archivo(s) adjunto(s):{' '}
            {payloadAttachments.map((a) => a.fileName).filter(Boolean).join(', ')}
          </p>
        )}
      </div>
    )
  }

  if (event.kind === 'PUBLIC_MESSAGE' && payload?.message) {
    return (
      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap rounded-md bg-sky-50/80 p-3 border border-sky-100">
        {String(payload.message)}
      </p>
    )
  }

  if (event.kind === 'USER_MESSAGE' && payload?.message) {
    return (
      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap rounded-md bg-violet-50/80 p-3 border border-violet-100">
        {String(payload.message)}
      </p>
    )
  }

  if (event.kind === 'INTERNAL_NOTE' && payload?.note) {
    return (
      <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{String(payload.note)}</p>
    )
  }

  if (event.kind === 'DROPI_REFRESH' && payload) {
    const status = payload.status as string | undefined
    return (
      <p className="mt-2 text-sm text-gray-600">
        {status ? `Estado Dropi: ${status}` : 'Datos sincronizados desde Dropi'}
      </p>
    )
  }

  if (event.kind === 'CASE_ASSIGNED' && payload?.assignedAt) {
    return (
      <p className="mt-1 text-xs text-gray-500">
        {new Date(String(payload.assignedAt)).toLocaleString('es-CO', {
          dateStyle: 'short',
          timeStyle: 'short',
        })}
      </p>
    )
  }

  return null
}

interface SupportCaseTimelineProps {
  events: SupportCaseEvent[]
}

const ADMIN_VISIBLE_KINDS = new Set([
  'CREATED',
  'CASE_ASSIGNED',
  'STATUS_CHANGED',
  'PUBLIC_MESSAGE',
  'USER_MESSAGE',
  'INTERNAL_NOTE',
  'DROPI_REFRESH',
])

export function SupportCaseTimeline({ events }: SupportCaseTimelineProps) {
  const visibleEvents = events.filter((e) => ADMIN_VISIBLE_KINDS.has(e.kind))

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Historial</h2>
      {visibleEvents.length === 0 ? (
        <p className="text-sm text-gray-500">Sin eventos</p>
      ) : (
        <ol className="relative space-y-0">
          {[...visibleEvents].reverse().map((event, index, arr) => {
            const isLast = index === arr.length - 1
            return (
              <li key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
                {!isLast ? (
                  <span
                    className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={`relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ${eventDotClass(event.kind)}`}
                  aria-hidden
                >
                  <span className="h-2 w-2 rounded-full bg-white" />
                </span>
                <div
                  className={`min-w-0 flex-1 rounded-lg border p-4 ${
                    event.kind === 'INTERNAL_NOTE'
                      ? 'border-amber-200 bg-amber-50/60'
                      : event.kind === 'USER_MESSAGE'
                        ? 'border-violet-200 bg-violet-50/40'
                        : event.kind === 'PUBLIC_MESSAGE'
                          ? 'border-sky-100 bg-white'
                          : 'border-gray-100 bg-gray-50/50'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {EVENT_LABELS[event.kind] ?? event.kind}
                    </span>
                    <time className="text-xs text-gray-400">
                      {new Date(event.createdAt).toLocaleString('es-CO', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </time>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {event.actorType === 'ADMIN'
                      ? 'Equipo Tanku'
                      : event.actorType === 'USER'
                        ? 'Usuario'
                        : 'Sistema'}
                  </p>
                  {renderEventBody(event)}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
