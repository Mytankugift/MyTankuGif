'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'

export type WishlistAccessConfirmMode = 'request' | 'cancel'

export interface WishlistAccessConfirmModalProps {
  open: boolean
  mode: WishlistAccessConfirmMode
  wishlistName: string
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

export function WishlistAccessConfirmModal({
  open,
  mode,
  wishlistName,
  onCancel,
  onConfirm,
  isLoading = false,
}: WishlistAccessConfirmModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!mounted || !open) return null

  const title =
    mode === 'request' ? 'Solicitar acceso' : 'Cancelar solicitud'
  const confirmLabel =
    mode === 'request'
      ? isLoading
        ? 'Enviando…'
        : 'Enviar solicitud'
      : isLoading
        ? 'Cancelando…'
        : 'Sí, cancelar solicitud'

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden
        role="presentation"
        onMouseDown={() => !isLoading && onCancel()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wishlist-access-confirm-title"
        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-[#414141] shadow-2xl"
        style={{ backgroundColor: '#171B21' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#414141] p-4">
          <h2
            id="wishlist-access-confirm-title"
            className="text-lg font-semibold text-white"
          >
            {title}
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
          {mode === 'request' ? (
            <p className="text-sm text-gray-300">
              ¿Quieres enviar una solicitud para ver la wishlist{' '}
              <span className="font-medium text-white">«{wishlistName}»</span>? Su
              propietario podrá aceptarla o rechazarla.
            </p>
          ) : (
            <p className="text-sm text-gray-300">
              ¿Cancelar la solicitud de acceso a{' '}
              <span className="font-medium text-white">«{wishlistName}»</span>? Podrás
              volver a solicitar acceso cuando quieras.
            </p>
          )}
        </div>
        <div className="flex gap-2 border-t border-[#414141] p-3 sm:p-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-full border border-[#414141] bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.1] disabled:opacity-40"
          >
            Atrás
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isLoading}
            className={confirmBtnClass(mode)}
            style={
              mode === 'request'
                ? {
                    background: 'linear-gradient(90deg, #73FFA2 0%, #1A485C 100%)',
                  }
                : undefined
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function confirmBtnClass(mode: WishlistAccessConfirmMode): string {
  const base =
    'flex-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] transition-opacity hover:opacity-90 disabled:opacity-40'
  if (mode === 'request') {
    return `${base} text-black`
  }
  return `${base} border border-orange-400/40 bg-orange-500/15 text-orange-100 hover:bg-orange-500/25`
}
