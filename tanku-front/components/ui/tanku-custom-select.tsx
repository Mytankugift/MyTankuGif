'use client'

import { createPortal } from 'react-dom'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

export type TankuCustomSelectOption = {
  value: string
  label: string
}

export interface TankuCustomSelectProps {
  id?: string
  label: string
  labelId?: string
  placeholder?: string
  value: string
  options: TankuCustomSelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  /** z-index del menú en portal (por defecto por encima de modales z-[200]) */
  menuZIndex?: number
  /** Trigger más bajo y texto pequeño (barras fila única). */
  compact?: boolean
}

/**
 * Selector estilo píldora con lista redondeada en portal (no usa &lt;select&gt; nativo).
 */
export function TankuCustomSelect({
  id,
  label,
  labelId,
  placeholder = 'Selecciona…',
  value,
  options,
  onChange,
  disabled = false,
  menuZIndex = 260,
  compact = false,
}: TankuCustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuPortalRef = useRef<HTMLUListElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label ?? null

  const updateMenuPos = useCallback(() => {
    const btn = triggerRef.current
    if (!btn || !open) return
    const r = btn.getBoundingClientRect()
    const margin = 12
    const vw = window.innerWidth
    let left = r.left
    let width = r.width
    if (left + width > vw - margin) {
      left = Math.max(margin, vw - margin - width)
    }
    if (left < margin) left = margin
    width = Math.min(width, vw - margin * 2)
    setMenuRect({ top: r.bottom + 6, left, width })
  }, [open])

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null)
      return
    }
    updateMenuPos()
  }, [open, updateMenuPos])

  useEffect(() => {
    if (!open) return
    const fn = () => updateMenuPos()
    window.addEventListener('resize', fn)
    window.addEventListener('scroll', fn, true)
    return () => {
      window.removeEventListener('resize', fn)
      window.removeEventListener('scroll', fn, true)
    }
  }, [open, updateMenuPos])

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuPortalRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  const triggerId = id ?? 'tanku-custom-select-trigger'
  const ariaLabelledBy = labelId ? `${labelId} ${triggerId}` : triggerId

  const triggerBtnClass = compact
    ? 'min-h-[26px] py-0.5 pl-2 pr-7 text-[11px] leading-tight'
    : 'min-h-[42px] py-2.5 pl-4 pr-11 text-sm'
  const chevronWrapClass = compact ? 'w-7' : 'w-11'
  const chevronIconClass = compact ? 'h-3.5 w-3.5' : 'h-5 w-5'

  return (
    <div className="relative">
      {label ? (
        <label
          id={labelId}
          htmlFor={triggerId}
          className="mb-2 block text-sm font-medium text-gray-300"
        >
          {label}
        </label>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={ariaLabelledBy}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`relative flex w-full items-center rounded-full border border-[#414141] bg-[#0f1218] text-left text-white outline-none transition-colors hover:border-[#73FFA2]/50 focus-visible:border-[#73FFA2] focus-visible:ring-2 focus-visible:ring-[#73FFA2]/25 disabled:cursor-not-allowed disabled:opacity-50 ${triggerBtnClass}`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${selectedLabel ? 'text-white' : 'text-gray-500'}`}
        >
          {selectedLabel ?? placeholder}
        </span>
        <span
          className={`pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center ${chevronWrapClass}`}
        >
          <ChevronDownIcon
            className={`${chevronIconClass} shrink-0 text-gray-400 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
            aria-hidden
          />
        </span>
      </button>

      {open &&
        menuRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <ul
            ref={menuPortalRef}
            role="listbox"
            aria-labelledby={labelId}
            style={{
              position: 'fixed',
              top: menuRect.top,
              left: menuRect.left,
              width: menuRect.width,
              zIndex: menuZIndex,
            }}
            className="max-h-52 overflow-auto rounded-2xl border border-[#414141] bg-[#171B21] py-1.5 shadow-2xl outline-none"
          >
            {options.map((opt) => (
              <li key={opt.value || 'empty'} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === opt.value}
                  className={`mx-1 flex w-[calc(100%-0.5rem)] rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06] ${
                    value === opt.value
                      ? 'bg-[#73FFA2]/15 font-medium text-[#73FFA2]'
                      : opt.value === ''
                        ? 'text-gray-500 hover:text-gray-300'
                        : 'text-white'
                  }`}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  )
}
