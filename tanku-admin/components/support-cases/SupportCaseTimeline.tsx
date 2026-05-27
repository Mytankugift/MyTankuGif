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
  STATUS_CHANGED: 'Cambio de estado',
  PUBLIC_MESSAGE: 'Mensaje al usuario',
  INTERNAL_NOTE: 'Nota interna',
  DROPI_REFRESH: 'Consulta Dropi',
}

function renderEventBody(event: SupportCaseEvent) {
  const payload = event.payload

  if (event.kind === 'STATUS_CHANGED' && payload) {
    const from = payload.from as string | undefined
    const to = payload.to as string | undefined
    if (from && to) {
      return (
        <p className="mt-1 text-sm text-gray-700">
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
    return (
      <div className="mt-2 space-y-1 text-sm text-gray-700">
        {caseType && (
          <p>
            <span className="text-gray-500">Motivo:</span>{' '}
            {CASE_TYPE_LABELS[caseType] ?? caseType}
          </p>
        )}
        {description && (
          <p className="whitespace-pre-wrap rounded-md bg-gray-50 p-2 text-gray-800 border border-gray-100">
            {description}
          </p>
        )}
      </div>
    )
  }

  if (event.kind === 'PUBLIC_MESSAGE' && payload?.message) {
    return (
      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap rounded-md bg-gray-50 p-2 border border-gray-100">
        {String(payload.message)}
      </p>
    )
  }

  if (event.kind === 'INTERNAL_NOTE' && payload?.note) {
    return (
      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{String(payload.note)}</p>
    )
  }

  return null
}

interface SupportCaseTimelineProps {
  events: SupportCaseEvent[]
}

export function SupportCaseTimeline({ events }: SupportCaseTimelineProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial</h2>
      {events.length === 0 ? (
        <p className="text-sm text-gray-500">Sin eventos</p>
      ) : (
        <ol className="relative border-l border-gray-200 ml-2 space-y-6">
          {[...events].reverse().map((event) => (
            <li key={event.id} className="ml-6">
              <span
                className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-white ${
                  event.kind === 'INTERNAL_NOTE' ? 'bg-amber-400' : 'bg-gray-400'
                }`}
              />
              <div
                className={
                  event.kind === 'INTERNAL_NOTE'
                    ? 'rounded-lg border border-amber-200 bg-amber-50/80 p-3'
                    : ''
                }
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
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
                <p className="text-xs text-gray-500 mt-0.5">
                  {event.actorType === 'ADMIN' ? 'Equipo Tanku' : event.actorType === 'USER' ? 'Usuario' : 'Sistema'}
                </p>
                {renderEventBody(event)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
