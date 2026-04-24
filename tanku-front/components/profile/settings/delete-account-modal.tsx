'use client'

import { useState } from 'react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const [confirmationText, setConfirmationText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isValidConfirmation =
    confirmationText.toUpperCase() === 'ELIMINAR' ||
    confirmationText.toUpperCase() === 'ELIMINAR CUENTA'

  const handleDelete = async () => {
    if (!isValidConfirmation) return

    setIsDeleting(true)
    setError(null)

    try {
      await onConfirm()
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la cuenta')
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (isDeleting) return
    setConfirmationText('')
    setError(null)
    onClose()
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[2000010] flex max-md:items-stretch max-md:justify-stretch max-md:px-2 max-md:pt-[max(6.25rem,calc(env(safe-area-inset-top,0px)+5rem))] max-md:pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] md:items-center md:justify-center md:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 z-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Cerrar"
      />
      <div
        className="pointer-events-auto relative z-10 flex max-h-full min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden rounded-[25px] border-2 border-red-500/50 bg-[#1a1a1a] shadow-xl max-md:mx-auto max-md:mb-0 md:max-h-[min(90dvh,42rem)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 sm:p-6">
          {/* Header */}
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" aria-hidden />
              <h2 id="delete-account-title" className="text-xl font-semibold text-white">
                Eliminar Cuenta
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="text-gray-400 transition-colors hover:text-white disabled:opacity-50"
              aria-label="Cerrar"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Warning */}
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-900/20 p-4">
            <p className="mb-2 text-sm font-medium text-red-400">Esta acción es permanente e irreversible</p>
            <p className="text-sm text-gray-300">Una vez eliminada tu cuenta, no podrás recuperarla.</p>
          </div>

          {/* What will be deleted */}
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-white">Se eliminará permanentemente:</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-400">
              <li>Tu perfil y toda tu información personal</li>
              <li>Tus posts, posters y stories</li>
              <li>Tus wishlists y productos guardados</li>
              <li>Tus grupos de Red Tanku</li>
              <li>Tus imágenes y archivos en S3</li>
              <li>Tu historial de actividad</li>
            </ul>
          </div>

          {/* What will be kept */}
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-white">Se mantendrá (anonimizado):</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-400">
              <li>Órdenes (para razones legales y financieras)</li>
              <li>Conversaciones (para otros participantes)</li>
              <li>StalkerGifts enviados/recibidos (para otros participantes)</li>
            </ul>
          </div>

          {/* Confirmation input — text-base (16px) evita zoom en iOS */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-white" htmlFor="delete-confirm-input">
              Para confirmar, escribe <span className="text-red-400">ELIMINAR</span> o{' '}
              <span className="text-red-400">ELIMINAR CUENTA</span>:
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={isDeleting}
              placeholder="Escribe aquí..."
              className="w-full rounded-[25px] border border-gray-600 bg-[#2a2a2a] px-4 py-2.5 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="mb-4 rounded border border-red-500/30 bg-red-900/20 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-auto flex shrink-0 gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="flex-1 rounded-[25px] bg-gray-700 px-4 py-2.5 text-base text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!isValidConfirmation || isDeleting}
              className="flex-1 rounded-[25px] bg-red-600 px-4 py-2.5 text-base text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Eliminando…
                </span>
              ) : (
                'Eliminar Cuenta'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
