'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'
import {
  CATEGORY_ICON_COL_CLASS,
  CATEGORY_ICON_IMAGE_CLASS,
  CATEGORY_ICON_SHELL_CLASS,
  CATEGORY_CHIP_IDLE_CLASS,
  CATEGORY_CHIP_SELECTED_CLASS,
  CATEGORY_CHIP_TEXT_IDLE_CLASS,
  CATEGORY_CHIP_TEXT_SELECTED_CLASS,
} from '@/components/feed/category-palette'

export function CategorySelector({
  categories,
  selectedCategoryId,
  onCategoryChange,
  isAuthenticated,
  onShowLoginModal,
}: {
  categories: { id: string | number; name: string; image?: string | null }[]
  selectedCategoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
  isAuthenticated: boolean
  onShowLoginModal?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const anchorRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  const updatePanelPosition = React.useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const GAP = 8
    const wide = vw >= 1024
    const w = wide
      ? Math.min(920, vw - 32)
      : Math.max(280, Math.min(569, vw - 16))

    // Debajo del botón «Categorías», alineado al borde izquierdo del ancla
    let left = rect.left
    if (left + w > vw - 8) left = Math.max(8, vw - w - 8)
    if (left < 8) left = 8

    let top = rect.bottom + GAP
    const maxPanelH = wide ? 480 : Math.min(vh * 0.72, 520)
    if (top + maxPanelH > vh - 8) {
      top = Math.max(8, vh - maxPanelH - 8)
    }

    setPanelStyle({
      position: 'fixed',
      top,
      left,
      width: w,
      maxHeight: wide ? '480px' : 'min(72vh, 520px)',
      zIndex: 200,
    })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) return
    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    document.addEventListener('scroll', updatePanelPosition, true)
    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      document.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [isOpen, updatePanelPosition])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node
      if (anchorRef.current?.contains(t) || panelRef.current?.contains(t)) {
        return
      }
      setIsOpen(false)
      setSearchQuery('')
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  /** Cerrar al hacer scroll fuera del botón o del panel (p. ej. feed); captura = cualquier contenedor con scroll */
  useEffect(() => {
    if (!isOpen) return

    const handleScroll = (event: Event) => {
      const t = event.target
      if (!(t instanceof Node)) {
        setIsOpen(false)
        setSearchQuery('')
        return
      }
      if (anchorRef.current?.contains(t) || panelRef.current?.contains(t)) {
        return
      }
      setIsOpen(false)
      setSearchQuery('')
    }

    document.addEventListener('scroll', handleScroll, true)
    return () => document.removeEventListener('scroll', handleScroll, true)
  }, [isOpen])

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const onPickAll = () => {
    if (!isAuthenticated && selectedCategoryId !== null) {
      onShowLoginModal?.()
      setIsOpen(false)
    } else {
      onCategoryChange(null)
      setIsOpen(false)
      setSearchQuery('')
    }
  }

  const onPickCategory = (categoryId: string) => {
    if (!isAuthenticated) {
      onShowLoginModal?.()
      setIsOpen(false)
    } else {
      onCategoryChange(categoryId)
      setIsOpen(false)
      setSearchQuery('')
    }
  }

  const dropdownPanel =
    isOpen &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={panelRef}
        className="flex flex-col rounded-2xl border border-[#73FFA2]/40 bg-[#1a1f24] shadow-xl backdrop-blur-sm"
        style={{
          ...panelStyle,
          padding: '12px',
        }}
      >
        {/* Fila superior: Todas + buscar categoría (mismo estilo que modal móvil) */}
        <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2 border-b border-white/[0.06] pb-2">
          <button
            type="button"
            onClick={onPickAll}
            className={clsx(
              'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors sm:text-xs',
              selectedCategoryId === null
                ? CATEGORY_CHIP_SELECTED_CLASS
                : CATEGORY_CHIP_IDLE_CLASS,
              selectedCategoryId === null
                ? CATEGORY_CHIP_TEXT_SELECTED_CLASS
                : CATEGORY_CHIP_TEXT_IDLE_CLASS
            )}
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Todas
          </button>
          <label className="relative flex min-w-[min(100%,12rem)] flex-1 items-center rounded-full bg-[#262626] px-3 py-1.5 ring-1 ring-white/[0.06] focus-within:ring-[#73FFA2]/35 sm:min-w-[200px]">
            <svg
              className="mr-1.5 h-4 w-4 shrink-0 text-white/45"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              placeholder="Buscar categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tanku-input-text-ios min-h-0 min-w-0 flex-1 bg-transparent text-white placeholder:text-white/40 outline-none md:text-[11px]"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="ml-1 shrink-0 rounded-full p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Limpiar búsqueda"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ) : null}
          </label>
        </div>

        <div
          className="grid grid-cols-2 gap-1.5 overflow-y-auto pr-0.5 custom-scrollbar sm:grid-cols-3 sm:gap-2 lg:grid-cols-4"
          style={{ maxHeight: 'min(46vh, 300px)' }}
        >
          {filteredCategories.map((category) => {
            const isSelected = selectedCategoryId === String(category.id)
            const found = categories.findIndex((c) => String(c.id) === String(category.id))
            const stableIndex = found >= 0 ? found : 0
            const hasImage = !!category.image

            return (
              <button
                type="button"
                key={category.id}
                onClick={() => onPickCategory(String(category.id))}
                className="group flex w-full min-w-0 cursor-pointer justify-stretch text-left"
              >
                <div
                  className={clsx(
                    'flex min-h-[30px] w-full items-stretch overflow-hidden rounded-full border transition-colors duration-200 sm:min-h-[32px]',
                    isSelected ? CATEGORY_CHIP_SELECTED_CLASS : CATEGORY_CHIP_IDLE_CLASS
                  )}
                >
                  <div className={CATEGORY_ICON_COL_CLASS}>
                    {hasImage && category.image ? (
                      <div className={CATEGORY_ICON_SHELL_CLASS}>
                        <Image
                          src={category.image}
                          alt={category.name}
                          width={28}
                          height={28}
                          unoptimized={isRemoteImageSrc(category.image)}
                          className={CATEGORY_ICON_IMAGE_CLASS}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex min-h-full min-w-[4.75rem] flex-1 items-center self-stretch px-2.5 py-0 sm:min-w-[5.5rem] sm:px-3">
                    <span
                      className={clsx(
                        'line-clamp-2 text-[10px] font-semibold leading-snug sm:text-[11px]',
                        isSelected ? CATEGORY_CHIP_TEXT_SELECTED_CLASS : CATEGORY_CHIP_TEXT_IDLE_CLASS
                      )}
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      {category.name}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {searchQuery && filteredCategories.length === 0 && (
          <p className="pt-2 text-center text-xs text-gray-400">
            Ninguna categoría coincide con &quot;{searchQuery}&quot;
          </p>
        )}
      </div>,
      document.body
    )

  return (
    <div className="relative flex h-full min-h-0 shrink-0 items-stretch" ref={anchorRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseDown={(e) => e.preventDefault()}
        className="flex h-full min-h-0 cursor-pointer items-center gap-2 border-0 bg-transparent px-1.5 text-white shadow-none outline-none ring-0 ring-offset-0 transition-[color] duration-200 focus:outline-none focus-visible:outline-none active:bg-transparent active:shadow-none [&:focus-visible]:ring-0"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <span
          className="text-sm font-medium leading-none text-[#73FFA2] sm:text-base"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Categorías
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="12"
          viewBox="0 0 30 14"
          fill="none"
          aria-hidden
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ease-out sm:h-3.5 sm:w-3.5 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <line
            y1="-2.5"
            x2="18.093"
            y2="-2.5"
            transform="matrix(-0.829163 0.559007 0.71276 0.701408 30 3.5087)"
            stroke="#73FFA2"
            strokeWidth="5"
          />
          <line
            y1="-2.5"
            x2="18.0922"
            y2="-2.5"
            transform="matrix(-0.829084 -0.559124 -0.712868 0.701299 15 13.6223)"
            stroke="#73FFA2"
            strokeWidth="5"
          />
        </svg>
      </button>
      {dropdownPanel}
    </div>
  )
}
