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
      className="pointer-events-none fixed inset-0 z-[2000010] flex max-md:items-center max-md:justify-center max-md:p-2 max-md:pt-[max(0.5rem,env(safe-area-inset-top,0px))] max-md:pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] md:items-center md:justify-center md:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 z-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Cerrar"
      />
      <div
        className="pointer-events-auto relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-[22px] border-2 border-red-500/50 bg-[#1a1a1a] shadow-xl max-md:max-h-[min(68dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.75rem))] max-md:flex-none md:rounded-[25px] md:max-h-[min(90dvh,42rem)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-2.5 sm:p-6 max-md:max-h-[inherit]">
          {/* Header */}
          <div className="mb-1.5 flex shrink-0 items-center justify-between sm:mb-4">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-red-500 sm:h-6 sm:w-6" aria-hidden />
              <h2 id="delete-account-title" className="truncate text-sm font-semibold text-white sm:text-xl">
                Eliminar Cuenta
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="shrink-0 text-gray-400 transition-colors hover:text-white disabled:opacity-50"
              aria-label="Cerrar"
            >
              <XMarkIcon className="h-4 w-4 sm:h-6 sm:w-6" />
            </button>
          </div>

          {/* Warning */}
          <div className="mb-1.5 rounded-lg border border-red-500/30 bg-red-900/20 p-2 sm:mb-4 sm:p-4">
            <p className="mb-0.5 text-[11px] font-medium leading-snug text-red-400 sm:mb-2 sm:text-sm">Esta acción es permanente e irreversible</p>
            <p className="text-[11px] leading-snug text-gray-300 sm:text-sm">Una vez eliminada tu cuenta, no podrás recuperarla.</p>
          </div>

          {/* Móvil: resumen compacto; escritorio: listas detalladas */}
          <div className="mb-1.5 sm:mb-4 md:hidden">
            <p className="text-[11px] leading-snug text-gray-400">
              Se borrarán perfil, publicaciones, wishlists, grupos, archivos e historial. Por ley y para otros usuarios, órdenes, chats y
              StalkerGifts quedan anonimizados.
            </p>
          </div>

          {/* What will be deleted — solo md+ */}
          <div className="mb-2 hidden sm:mb-4 md:block">
            <h3 className="mb-1 text-xs font-semibold text-white sm:mb-2 sm:text-sm">Se eliminará permanentemente:</h3>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-gray-400 sm:space-y-1 sm:text-sm">
              <li>Tu perfil y toda tu información personal</li>
              <li>Tus posts, posters y stories</li>
              <li>Tus wishlists y productos guardados</li>
              <li>Tus grupos de Red Tanku</li>
              <li>Tus imágenes y archivos en S3</li>
              <li>Tu historial de actividad</li>
            </ul>
          </div>

          {/* What will be kept — solo md+ */}
          <div className="mb-2 hidden sm:mb-4 md:block">
            <h3 className="mb-1 text-xs font-semibold text-white sm:mb-2 sm:text-sm">Se mantendrá (anonimizado):</h3>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-gray-400 sm:space-y-1 sm:text-sm">
              <li>Órdenes (para razones legales y financieras)</li>
              <li>Conversaciones (para otros participantes)</li>
              <li>StalkerGifts enviados/recibidos (para otros participantes)</li>
            </ul>
          </div>

          {/* Confirmation input — text-base (16px) evita zoom en iOS */}
          <div className="mb-1.5 sm:mb-4">
            <label className="mb-0.5 block text-[11px] font-medium leading-snug text-white sm:mb-2 sm:text-sm" htmlFor="delete-confirm-input">
              Escribe <span className="text-red-400">ELIMINAR</span> o <span className="text-red-400">ELIMINAR CUENTA</span>:
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={isDeleting}
              placeholder="Escribe aquí..."
              className="w-full rounded-[20px] border border-gray-600 bg-[#2a2a2a] px-2.5 py-1.5 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none disabled:opacity-50 sm:rounded-[25px] sm:px-4 sm:py-2.5"
            />
          </div>

          {error && (
            <div className="mb-2 rounded border border-red-500/30 bg-red-900/20 px-3 py-1.5 text-xs text-red-400 sm:mb-4 sm:px-4 sm:py-2 sm:text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-auto flex shrink-0 gap-1.5 pt-0.5 sm:gap-3 sm:pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="flex-1 rounded-[20px] bg-gray-700 px-2.5 py-1.5 text-xs text-white transition-colors hover:bg-gray-600 disabled:opacity-50 sm:rounded-[25px] sm:px-4 sm:py-2.5 sm:text-base"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!isValidConfirmation || isDeleting}
              className="flex-1 rounded-[20px] bg-red-600 px-2.5 py-1.5 text-xs text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-[25px] sm:px-4 sm:py-2.5 sm:text-base"
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
