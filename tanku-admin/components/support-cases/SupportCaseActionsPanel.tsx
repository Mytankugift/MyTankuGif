'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import {
  assignedAdminDisplayName,
  getNextStatusTransitions,
  supportCaseHasPublicReply,
  type SupportCaseDetail,
  type SupportCaseStatus,
} from '@/lib/types/support-cases'
import { SupportCaseResolveConfirmModal } from '@/components/support-cases/SupportCaseResolveConfirmModal'

interface SupportCaseActionsPanelProps {
  detail: SupportCaseDetail
  onUpdated: (detail: SupportCaseDetail) => void
  /** header | response | note | forms (legacy) | all (legacy) */
  section?: 'header' | 'response' | 'note' | 'forms' | 'all'
}

export function SupportCaseActionsPanel({
  detail,
  onUpdated,
  section = 'all',
}: SupportCaseActionsPanelProps) {
  const adminUser = useAdminAuthStore((s) => s.user)
  const adminId = adminUser?.id

  const [message, setMessage] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)

  const hasPublicReply = supportCaseHasPublicReply(detail.events)

  const isAssignedToMe = detail.assignedAdminUserId === adminId
  const isUnassigned = !detail.assignedAdminUserId
  const assignedOther =
    detail.assignedAdminUserId && detail.assignedAdminUserId !== adminId

  const postAction = async (
    key: string,
    url: string,
    body?: Record<string, string | boolean>,
    onSuccess?: () => void
  ) => {
    setBusy(key)
    setError(null)
    try {
      const response = await apiClient.post<{ success: boolean; data: SupportCaseDetail }>(
        url,
        body ?? {}
      )
      if (response.data.data) {
        onUpdated(response.data.data)
        if (key === 'message') setMessage('')
        if (key === 'note') setNote('')
        onSuccess?.()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en la acción')
    } finally {
      setBusy(null)
    }
  }

  const canRespond = isAssignedToMe && ['IN_REVIEW', 'WAITING_USER'].includes(detail.status)

  const focusResponseField = () => {
    const el =
      document.getElementById('support-public-message') ??
      document.getElementById('support-public-message-all')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (el instanceof HTMLTextAreaElement) {
      el.focus()
    }
  }

  const handleStatusAction = (next: SupportCaseStatus) => {
    const endpoint = statusActionEndpoint(next)
    if (!endpoint) return
    if (next === 'RESOLVED') {
      setResolveModalOpen(true)
      return
    }
    void postAction(endpoint.key, endpoint.url)
  }

  const confirmResolve = (acknowledgeNoReply: boolean) => {
    void postAction(
      'resolve',
      API_ENDPOINTS.ADMIN.SUPPORT_CASES.RESOLVE(detail.id),
      { acknowledgeNoReply },
      () => setResolveModalOpen(false)
    )
  }

  const statusActionEndpoint = (next: SupportCaseStatus): { key: string; url: string } | null => {
    switch (next) {
      case 'IN_REVIEW':
        return {
          key: 'start-review',
          url: API_ENDPOINTS.ADMIN.SUPPORT_CASES.START_REVIEW(detail.id),
        }
      case 'RESOLVED':
        return { key: 'resolve', url: API_ENDPOINTS.ADMIN.SUPPORT_CASES.RESOLVE(detail.id) }
      case 'CLOSED':
        return { key: 'close', url: API_ENDPOINTS.ADMIN.SUPPORT_CASES.CLOSE(detail.id) }
      default:
        return null
    }
  }

  const statusButtonClass = (variant: 'primary' | 'secondary') => {
    if (variant === 'secondary') {
      return 'rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60'
    }
    if (detail.status === 'RESOLVED') {
      return 'rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60'
    }
    if (detail.status === 'IN_REVIEW' || detail.status === 'WAITING_USER') {
      return 'rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60'
    }
    return 'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60'
  }

  const actionButtons = (
    <div className="flex flex-wrap justify-end gap-2">
      {isUnassigned && (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => postAction('take', API_ENDPOINTS.ADMIN.SUPPORT_CASES.TAKE(detail.id))}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {busy === 'take' ? 'Tomando…' : 'Tomar PQR'}
        </button>
      )}

      {isAssignedToMe &&
        getNextStatusTransitions(detail.status).map((transition) => {
          const endpoint = statusActionEndpoint(transition.next)
          if (!endpoint) return null
          return (
            <button
              key={transition.next}
              type="button"
              disabled={!!busy}
              onClick={() => handleStatusAction(transition.next)}
              className={statusButtonClass(transition.variant)}
            >
              {busy === endpoint.key ? 'Actualizando…' : transition.label}
            </button>
          )
        })}
    </div>
  )

  const resolveModal = (
    <SupportCaseResolveConfirmModal
      open={resolveModalOpen}
      caseRef={detail.ref}
      hasPublicReply={hasPublicReply}
      loading={busy === 'resolve'}
      onClose={() => setResolveModalOpen(false)}
      onConfirm={confirmResolve}
      onFocusResponse={focusResponseField}
    />
  )

  const assignmentLine = detail.assignedAdmin ? (
    <p className="text-right text-xs text-gray-500">
      Asignado:{' '}
      <span className="font-medium text-gray-700">
        {assignedAdminDisplayName(detail.assignedAdmin)}
      </span>
    </p>
  ) : (
    <p className="text-right text-xs font-medium text-amber-700">Sin asignar</p>
  )

  if (section === 'header') {
    return (
      <div className="shrink-0 w-full sm:max-w-md sm:min-w-[12rem] space-y-2">
        {resolveModal}
        {assignmentLine}
        {assignedOther ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-right text-xs text-amber-900">
            Tomado por otro agente
          </p>
        ) : (
          actionButtons
        )}
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-right text-xs text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  const responseForm = (
    <>
      {canRespond ? (
        <div className="space-y-2">
          <label
            className="block text-xs font-medium text-gray-500"
            htmlFor="support-public-message"
          >
            Respuesta al usuario
          </label>
          <textarea
            id="support-public-message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            placeholder="Escribe tu mensaje para el usuario…"
          />
          <button
            type="button"
            disabled={!!busy || message.trim().length < 3}
            onClick={() =>
              postAction('message', API_ENDPOINTS.ADMIN.SUPPORT_CASES.MESSAGES(detail.id), {
                message: message.trim(),
              })
            }
            className="rounded-md bg-[#0092c6] px-4 py-2 text-sm font-medium text-white hover:bg-[#007bb5] disabled:opacity-60"
          >
            {busy === 'message' ? 'Enviando…' : 'Enviar respuesta'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          {assignedOther
            ? 'Este caso está asignado a otro agente.'
            : !isAssignedToMe
              ? 'Toma el caso y pásalo a en revisión para responder al usuario.'
              : 'No puedes enviar mensajes en este estado del caso.'}
        </p>
      )}
    </>
  )

  const noteForm = isAssignedToMe && detail.status !== 'CLOSED' && (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-900">Nota interna</h2>
      <p className="text-xs text-gray-500">Solo visible para el equipo en el historial del caso.</p>
      <label className="sr-only" htmlFor="support-internal-note">
        Nota interna
      </label>
      <textarea
        id="support-internal-note"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm text-gray-900"
        placeholder="Nota visible solo para el equipo…"
      />
      <button
        type="button"
        disabled={!!busy || note.trim().length < 3}
        onClick={() =>
          postAction('note', API_ENDPOINTS.ADMIN.SUPPORT_CASES.NOTES(detail.id), {
            note: note.trim(),
          })
        }
        className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
      >
        {busy === 'note' ? 'Guardando…' : 'Guardar nota'}
      </button>
    </div>
  )

  if (section === 'response') {
    if (assignedOther) {
      return (
        <p className="text-sm text-amber-800">
          Este caso está tomado por otro agente. Solo puedes consultar el detalle.
        </p>
      )
    }
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Respuesta al usuario</h2>
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {responseForm}
      </div>
    )
  }

  if (section === 'note') {
    if (assignedOther) return null
    return (
      <div className="space-y-3">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {noteForm ?? (
          <p className="text-sm text-gray-500">
            Las notas internas no están disponibles en este estado del caso.
          </p>
        )}
      </div>
    )
  }

  if (section === 'forms') {
    if (assignedOther) return null
    return (
      <div className="space-y-4 border-t border-gray-100 pt-5">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {responseForm}
        {noteForm}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      {resolveModal}
      <h2 className="text-sm font-semibold text-gray-900">Acciones</h2>

      {detail.assignedAdmin ? (
        <p className="mt-2 text-sm text-gray-600">
          Asignado a{' '}
          <span className="font-medium text-gray-900">
            {assignedAdminDisplayName(detail.assignedAdmin)}
          </span>
          {detail.assignedAt ? (
            <span className="text-gray-500">
              {' '}
              ·{' '}
              {new Date(detail.assignedAt).toLocaleString('es-CO', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </span>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-sm text-amber-700">Sin asignar</p>
      )}

      {assignedOther ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Este caso está tomado por otro agente. Solo puedes consultar el detalle.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4">{actionButtons}</div>

      {canRespond && (
        <div className="mt-5 space-y-2 border-t border-gray-100 pt-4">
          <label className="block text-xs font-medium text-gray-500" htmlFor="support-public-message-all">
            Respuesta al usuario
          </label>
          <textarea
            id="support-public-message-all"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            placeholder="Escribe tu mensaje para el usuario…"
          />
          <button
            type="button"
            disabled={!!busy || message.trim().length < 3}
            onClick={() =>
              postAction('message', API_ENDPOINTS.ADMIN.SUPPORT_CASES.MESSAGES(detail.id), {
                message: message.trim(),
              })
            }
            className="rounded-md bg-[#0092c6] px-4 py-2 text-sm font-medium text-white hover:bg-[#007bb5] disabled:opacity-60"
          >
            {busy === 'message' ? 'Enviando…' : 'Enviar respuesta'}
          </button>
        </div>
      )}

      {isAssignedToMe && detail.status !== 'CLOSED' && (
        <div className="mt-5 space-y-2 border-t border-gray-100 pt-4">
          <label className="block text-xs font-medium text-gray-500" htmlFor="support-internal-note-all">
            Nota interna (solo ERP)
          </label>
          <textarea
            id="support-internal-note-all"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm text-gray-900"
            placeholder="Nota visible solo para el equipo…"
          />
          <button
            type="button"
            disabled={!!busy || note.trim().length < 3}
            onClick={() =>
              postAction('note', API_ENDPOINTS.ADMIN.SUPPORT_CASES.NOTES(detail.id), {
                note: note.trim(),
              })
            }
            className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          >
            {busy === 'note' ? 'Guardando…' : 'Guardar nota'}
          </button>
        </div>
      )}
    </div>
  )
}
