'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface SupportCaseResolveConfirmModalProps {
  open: boolean
  caseRef: string | null
  hasPublicReply: boolean
  loading?: boolean
  onClose: () => void
  onConfirm: (acknowledgeNoReply: boolean) => void
  onFocusResponse?: () => void
}

export function SupportCaseResolveConfirmModal({
  open,
  caseRef,
  hasPublicReply,
  loading = false,
  onClose,
  onConfirm,
  onFocusResponse,
}: SupportCaseResolveConfirmModalProps) {
  const [ackOtherChannel, setAckOtherChannel] = useState(false)

  if (!open) return null

  const canConfirmWithoutReply = hasPublicReply || ackOtherChannel

  const handleClose = () => {
    if (loading) return
    setAckOtherChannel(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolve-confirm-title"
        className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="resolve-confirm-title" className="text-lg font-bold text-gray-900">
            Marcar como resuelto
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
          <p>
            Vas a marcar {caseRef ? <strong>{caseRef}</strong> : 'este caso'} como{' '}
            <strong>Resuelto</strong>. El cliente recibirá una notificación de cierre en la app.
          </p>

          {!hasPublicReply ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-amber-950">
              <p className="font-medium">No consta ningún mensaje público de soporte</p>
              <p className="mt-1 text-amber-900/90">
                Si no le has respondido en la app, el usuario solo verá que el caso quedó resuelto
                sin saber qué pasó con su reclamo.
              </p>
            </div>
          ) : (
            <p className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-green-900">
              Este caso ya tiene al menos un mensaje de soporte visible para el cliente.
            </p>
          )}

          {!hasPublicReply ? (
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-1 rounded border-gray-300"
                checked={ackOtherChannel}
                onChange={(e) => setAckOtherChannel(e.target.checked)}
                disabled={loading}
              />
              <span>
                Confirmo que el cliente fue informado por otro canal (llamada, WhatsApp, etc.) o
                que no requiere respuesta en la app.
              </span>
            </label>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          {!hasPublicReply && onFocusResponse ? (
            <button
              type="button"
              onClick={() => {
                handleClose()
                onFocusResponse()
              }}
              disabled={loading}
              className="rounded-lg border border-[#0092c6] px-4 py-2.5 text-sm font-medium text-[#0092c6] hover:bg-teal-50 disabled:opacity-50"
            >
              Enviar mensaje primero
            </button>
          ) : null}
          <button
            type="button"
            disabled={loading || !canConfirmWithoutReply}
            onClick={() => {
              onConfirm(!hasPublicReply)
              setAckOtherChannel(false)
            }}
            className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Marcar como resuelto'}
          </button>
        </div>
      </div>
    </div>
  )
}
