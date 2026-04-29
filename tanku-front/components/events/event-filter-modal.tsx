'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { EVENT_COLOR_PRESETS, normalizeEventColor } from '@/lib/event-colors'
import type { EventColorPreset } from '@/lib/hooks/use-event-color-presets'

export interface EventFilterModalProps {
  open: boolean
  onClose: () => void
  colorFilter: string | null
  onColorFilterChange: React.Dispatch<React.SetStateAction<string | null>>
  savedColorPresets: EventColorPreset[]
  orphanColorsForFilter: string[]
}

export function EventFilterModal({
  open,
  onClose,
  colorFilter,
  onColorFilterChange,
  savedColorPresets,
  orphanColorsForFilter,
}: EventFilterModalProps) {
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

  const chipInactive =
    'border-gray-600 text-gray-400 hover:border-gray-500'
  const chipActiveTodos = 'border-[#73FFA2] text-[#73FFA2]'
  const chipActiveColor = 'border-white text-white bg-white/10'

  return createPortal(
    <div
      className="fixed inset-0 z-[1000420] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-filter-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={clsx(
          'flex max-h-[min(85dvh,32rem)] w-full max-w-lg flex-col rounded-t-[25px] border border-white/[0.1] bg-[#1a1f24] shadow-[0_-8px_40px_rgba(0,0,0,0.45)] sm:rounded-[25px] sm:shadow-[0_20px_60px_rgba(0,0,0,0.5)]',
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-5">
          <h2
            id="event-filter-modal-title"
            className="text-base font-semibold text-zinc-100"
          >
            Filtrar por categoría
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <p className="mb-3 text-[11px] text-zinc-500">
            Elige un color para ver solo esos eventos en la lista, o «Todos».
          </p>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            <button
              type="button"
              onClick={() => onColorFilterChange(null)}
              className={clsx(
                'rounded-full border px-3 py-1 text-[11px] transition-colors md:text-xs',
                colorFilter === null ? chipActiveTodos : chipInactive,
              )}
            >
              Todos
            </button>
            {EVENT_COLOR_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                title={p.label}
                onClick={() =>
                  onColorFilterChange((f) => (f === p.hex ? null : p.hex))
                }
                className={clsx(
                  'inline-flex max-w-[min(100%,9rem)] items-center gap-1 rounded-full border px-2 py-1 text-[10px] leading-tight transition-colors md:text-[11px]',
                  colorFilter === p.hex ? chipActiveColor : chipInactive,
                )}
                aria-label={p.label}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                  style={{ backgroundColor: p.hex }}
                />
                <span className="truncate">{p.label}</span>
              </button>
            ))}
            {savedColorPresets.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                onClick={() =>
                  onColorFilterChange((f) =>
                    f === normalizeEventColor(p.hex)
                      ? null
                      : normalizeEventColor(p.hex),
                  )
                }
                className={clsx(
                  'inline-flex max-w-[min(100%,9rem)] items-center gap-1 rounded-full border px-2 py-1 text-[10px] leading-tight transition-colors md:text-[11px]',
                  colorFilter?.toLowerCase() ===
                  normalizeEventColor(p.hex).toLowerCase()
                    ? chipActiveColor
                    : chipInactive,
                )}
                aria-label={p.label}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                  style={{ backgroundColor: p.hex }}
                />
                <span className="truncate">{p.label}</span>
              </button>
            ))}
            {orphanColorsForFilter.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                onClick={() =>
                  onColorFilterChange((f) =>
                    f?.toLowerCase() === hex
                      ? null
                      : normalizeEventColor(hex),
                  )
                }
                className={clsx(
                  'inline-flex max-w-[min(100%,8rem)] items-center gap-1 rounded-full border px-2 py-1 text-[10px] leading-tight transition-colors md:text-[11px]',
                  colorFilter?.toLowerCase() === hex
                    ? chipActiveColor
                    : chipInactive,
                )}
                aria-label={`Color ${hex}`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                  style={{ backgroundColor: hex }}
                />
                <span className="truncate">{hex.slice(1, 5)}…</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 justify-center border-t border-white/[0.08] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[5.5rem] rounded-xl border border-[#66DEDB] bg-[#66DEDB] px-5 py-1.5 text-xs font-semibold text-[#0d1619] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-2px_5px_rgba(0,0,0,0.22)] hover:bg-[#8df5f1] active:bg-[#5bd8d4] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-2px_5px_rgba(0,0,0,0.2)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]"
          >
            Listo
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
