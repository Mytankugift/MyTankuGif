/**
 * Opciones de tarjeta de amigo — modal centrado (mismo espíritu que FriendsSortSheet)
 */

'use client'

import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export function FriendCardOptionsModal({
  open,
  onClose,
  title = 'Opciones',
  onBlock,
  onRemove,
  isBlocking,
  isRemoving,
}: {
  open: boolean
  onClose: () => void
  title?: string
  onBlock: () => void
  onRemove: () => void
  isBlocking: boolean
  isRemoving: boolean
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[285] flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="friend-card-options-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[16.5rem] overflow-hidden rounded-2xl border border-[#414141] bg-[#171B21] shadow-2xl">
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{
            borderImage:
              'linear-gradient(90deg, #414141 0%, #73FFA2 34%, #73FFA2 70%, #414141 100%) 1',
          }}
        >
          <h2 id="friend-card-options-modal-title" className="min-w-0 truncate text-xs font-semibold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <ul className="py-2" role="list">
          <li>
            <button
              type="button"
              className="mx-2 flex w-[calc(100%-1rem)] rounded-lg px-2 py-2.5 text-left text-[11px] leading-snug text-amber-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:bg-white/[0.06]"
              disabled={isBlocking}
              onClick={() => {
                onClose()
                onBlock()
              }}
            >
              {isBlocking ? '…' : 'Bloquear'}
            </button>
          </li>
          <li>
            <button
              type="button"
              className="mx-2 mt-1 flex w-[calc(100%-1rem)] rounded-lg px-2 py-2.5 text-left text-[11px] leading-snug text-red-400/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:bg-white/[0.06]"
              disabled={isRemoving}
              onClick={() => {
                onClose()
                onRemove()
              }}
            >
              {isRemoving ? '…' : 'Eliminar de amigos'}
            </button>
          </li>
        </ul>
      </div>
    </div>,
    document.body,
  )
}
