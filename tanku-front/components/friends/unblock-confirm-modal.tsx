'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'

type UnblockConfirmModalProps = {
  open: boolean
  displayName: string
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

export function UnblockConfirmModal({
  open,
  displayName,
  onCancel,
  onConfirm,
  isLoading = false,
}: UnblockConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden
        onClick={() => !isLoading && onCancel()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unblock-confirm-title"
        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-[#414141] shadow-2xl"
        style={{ backgroundColor: '#171B21' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#414141] p-4">
          <h2 id="unblock-confirm-title" className="text-lg font-semibold text-white">
            Desbloquear usuario
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-300">
            ¿Seguro que quieres desbloquear a{' '}
            <span className="font-medium text-white">{displayName}</span>? Podrá volver a ver tu perfil
            e interactuar contigo según tu privacidad.
          </p>
        </div>
        <div className="flex gap-3 border-t border-[#414141] p-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-full border border-[#414141] bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1] disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isLoading}
            className="flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-black shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: 'linear-gradient(90deg, #73FFA2 0%, #1A485C 100%)' }}
          >
            {isLoading ? 'Desbloqueando…' : 'Desbloquear'}
          </button>
        </div>
      </div>
    </div>
  )
}
