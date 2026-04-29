'use client'

import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export type StalkerGiftMisFilter =
  | 'all'
  | 'pending'
  | 'accepted'
  | 'sent'
  | 'rejected'

export const STALKERGIFT_MIS_FILTER_OPTIONS: { value: StalkerGiftMisFilter; label: string; description?: string }[] =
  [
    { value: 'all', label: 'Todos', description: 'Regalos enviados y recibidos' },
    {
      value: 'pending',
      label: 'Pendientes',
      description: 'Pago o esperando que alguien acepte',
    },
    {
      value: 'accepted',
      label: 'Aceptados',
      description: 'Regalo aceptado en Tanku',
    },
    {
      value: 'sent',
      label: 'Enviados',
      description: 'Solo los que tú iniciaste como remitente',
    },
    {
      value: 'rejected',
      label: 'Rechazados o cancelados',
      description: 'Incluye cancelados desde borrador/flujo',
    },
  ]

export function labelForMisFilter(filter: StalkerGiftMisFilter): string {
  return STALKERGIFT_MIS_FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? 'Todos'
}

export function MisStalkerGiftFilterSheet({
  open,
  onClose,
  value,
  onChange,
}: {
  open: boolean
  onClose: () => void
  value: StalkerGiftMisFilter
  onChange: (v: StalkerGiftMisFilter) => void
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
      aria-labelledby="stalkergift-mis-filter-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[18rem] overflow-hidden rounded-2xl border border-[#414141] bg-[#171B21] shadow-2xl">
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{
            borderImage:
              'linear-gradient(90deg, #414141 0%, #73FFA2 34%, #73FFA2 70%, #414141 100%) 1',
          }}
        >
          <h2 id="stalkergift-mis-filter-title" className="text-xs font-semibold text-white">
            ¿Qué quieres ver?
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
        <ul className="custom-scrollbar max-h-[min(60vh,20rem)] overflow-y-auto py-1.5" role="listbox">
          {STALKERGIFT_MIS_FILTER_OPTIONS.map((opt) => (
            <li key={opt.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={value === opt.value}
                className={`mx-1.5 flex w-[calc(100%-0.75rem)] flex-col items-start rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.06] ${
                  value === opt.value
                    ? 'bg-[#73FFA2]/15 font-medium text-[#73FFA2]'
                    : 'text-white'
                }`}
                onClick={() => {
                  onChange(opt.value)
                  onClose()
                }}
              >
                <span className="text-[11px] leading-snug">{opt.label}</span>
                {opt.description ? (
                  <span className="mt-0.5 text-[10px] font-normal leading-snug text-gray-500">{opt.description}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  )
}
