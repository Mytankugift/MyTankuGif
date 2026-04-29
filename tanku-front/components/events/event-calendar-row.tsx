'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import type { ReactNode } from 'react'
import type { CalendarEvent } from '@/lib/hooks/use-events'
import {
  EVENT_COLOR_PRESETS,
  normalizeEventColor,
} from '@/lib/event-colors'

function hexToRgba(hex: string, alpha: number): string {
  const n = normalizeEventColor(hex)
  const h = n.slice(1)
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function resolveCategoryLabel(
  hex: string,
  /** Tipos/colores guardados por el usuario (nombre “test”, etc.) */
  savedHexLabels?: readonly { hex: string; label: string }[],
): string {
  const n = normalizeEventColor(hex).toLowerCase()
  const preset = EVENT_COLOR_PRESETS.find((p) => p.hex.toLowerCase() === n)
  if (preset) return preset.label
  const saved = savedHexLabels?.find(
    (s) => normalizeEventColor(s.hex).toLowerCase() === n,
  )
  if (saved?.label?.trim()) return saved.label.trim()
  return hex
}

export interface EventCalendarRowProps {
  event: CalendarEvent
  /** Colores/tipos personalizados (API `color-presets`) para mostrar la etiqueta correcta */
  savedColorLabels?: readonly { hex: string; label: string }[]
  onClick?: () => void
  /** Acciones extra a la derecha del bloque central (editar/eliminar en modal) */
  actions?: ReactNode
  className?: string
}

/**
 * Fila «Próximos eventos»: icono circundado en color de categoría (sin glow), texto compacto y chip fecha.
 */
export function EventCalendarRow({
  event,
  savedColorLabels,
  onClick,
  actions,
  className = '',
}: EventCalendarRowProps) {
  const hex = normalizeEventColor(event.color)
  const label = resolveCategoryLabel(hex, savedColorLabels)
  const eventDate = new Date(event.date)

  const body = (
    <>
      <div className="relative flex shrink-0 items-center justify-center self-center">
        <div
          className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 sm:h-10 sm:w-10"
          style={{
            borderColor: hexToRgba(hex, 0.8),
            backgroundColor: hexToRgba(hex, 0.3),
          }}
        >
          <CalendarDaysIcon className="h-[18px] w-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] sm:h-5 sm:w-5" />
        </div>
      </div>

      <div className="min-w-0 flex-1 py-px">
        <h4 className="truncate text-[13px] font-semibold leading-tight text-white sm:text-sm">
          {event.title}
        </h4>
        <p className="mt-px flex items-center gap-1 text-[10px] leading-tight text-zinc-400 sm:text-[11px]">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-white/20"
            style={{ backgroundColor: hex }}
          />
          <span>{label}</span>
        </p>
        {event.description ? (
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-500 sm:text-[11px]">
            {event.description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-center justify-center self-center rounded-lg border border-white/[0.1] bg-[#1e242d]/95 px-1.5 py-1 text-center">
        <span className="text-[8px] font-medium uppercase leading-none text-zinc-500">
          {format(eventDate, 'EEE', { locale: es })}
        </span>
        <span className="text-base font-bold tabular-nums leading-none text-white sm:text-[17px]">
          {format(eventDate, 'd')}
        </span>
        <span className="text-[8px] font-medium uppercase leading-none text-zinc-500">
          {format(eventDate, 'MMM', { locale: es })}
        </span>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 self-center border-l border-white/[0.06] pl-1.5">
          {actions}
        </div>
      ) : null}
    </>
  )

  const inner = (
    <div
      className={`flex min-w-0 items-stretch gap-2 rounded-xl border border-white/[0.08] bg-[#141a22]/90 px-2 py-1.5 pr-1.5 transition-colors sm:gap-2.5 sm:px-2.5 sm:py-2 ${onClick ? 'cursor-pointer hover:border-[#66DEDB]/35' : ''} ${className}`}
    >
      {body}
    </div>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {inner}
      </button>
    )
  }

  return inner
}
