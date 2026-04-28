/**
 * Selector de orden en amigos: modal centrado (todos los breakpoints).
 */

'use client'

import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { TankuCustomSelectOption } from '@/components/ui/tanku-custom-select'

export function FriendsSortSheet({
  open,
  onClose,
  options,
  value,
  onChange,
  title = 'Orden',
}: {
  open: boolean
  onClose: () => void
  options: TankuCustomSelectOption[]
  value: string
  onChange: (v: string) => void
  title?: string
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
      aria-labelledby="friends-sort-sheet-title"
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
          <h2 id="friends-sort-sheet-title" className="text-xs font-semibold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <ul className="custom-scrollbar max-h-[min(52vh,14rem)] overflow-y-auto py-1.5" role="listbox">
          {options.map((opt) => (
            <li key={opt.value || 'empty'} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={value === opt.value}
                className={`mx-1.5 flex w-[calc(100%-0.75rem)] rounded-lg px-2 py-2 text-left text-[11px] leading-snug transition-colors hover:bg-white/[0.06] ${
                  value === opt.value
                    ? 'bg-[#73FFA2]/15 font-medium text-[#73FFA2]'
                    : 'text-white'
                }`}
                onClick={() => {
                  onChange(opt.value)
                  onClose()
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  )
}
