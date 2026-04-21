'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import {
  CATEGORY_PALETTE_RGB,
  categoryBorder,
  categoryFillLeft,
  categoryFillRight,
} from '@/components/feed/category-palette'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'

export type FeedCategoryLite = { id: string | number; name: string; image?: string | null }

export interface FeedCategoriesMobileModalProps {
  open: boolean
  onClose: () => void
  categories: FeedCategoryLite[]
  onPickCategory: (categoryId: string | null) => void
}

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

function paletteIndex(cat: FeedCategoryLite, salt: number) {
  const s = `${cat.id}:${cat.name}:${salt}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % 9973
  return h % CATEGORY_PALETTE_RGB.length
}

function featuredGradient(slot: number) {
  const [r, g, b] = CATEGORY_PALETTE_RGB[slot % CATEGORY_PALETTE_RGB.length]
  const [r2, g2, b2] = CATEGORY_PALETTE_RGB[(slot + 2) % CATEGORY_PALETTE_RGB.length]
  return `linear-gradient(145deg, rgba(${r},${g},${b},0.92) 0%, rgba(${r2},${g2},${b2},0.75) 100%)`
}

export function FeedCategoriesMobileModal({
  open,
  onClose,
  categories,
  onPickCategory,
}: FeedCategoriesMobileModalProps) {
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  /** Sigue montado durante la animación de cierre */
  const [panelVisible, setPanelVisible] = useState(open)
  const [isExiting, setIsExiting] = useState(false)
  const exitCompleteGuard = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const finishClose = useCallback(() => {
    if (exitCompleteGuard.current) return
    exitCompleteGuard.current = true
    setPanelVisible(false)
    setIsExiting(false)
    setQuery('')
  }, [])

  useEffect(() => {
    if (open) {
      exitCompleteGuard.current = false
      setPanelVisible(true)
      setIsExiting(false)
      setQuery('')
    }
  }, [open])

  useEffect(() => {
    if (!open && panelVisible && !isExiting) {
      setIsExiting(true)
    }
  }, [open, panelVisible, isExiting])

  useEffect(() => {
    if (!isExiting) return
    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      finishClose()
    }
  }, [isExiting, finishClose])

  useEffect(() => {
    if (!panelVisible) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [panelVisible])

  const featured = useMemo(() => categories.slice(0, 4), [categories])

  const filteredAll = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return categories
    return categories.filter((c) => normalize(c.name).includes(q))
  }, [categories, query])

  if (!mounted || !panelVisible) return null

  const overlay = (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/55 px-3 pb-4 pt-[max(14px,calc(env(safe-area-inset-top)+28px))] md:items-center md:justify-center md:p-6 md:pb-6 md:pt-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feed-categories-mobile-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={clsx(
          'flex h-[min(86vh,680px)] max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-24px)] w-full max-w-lg shrink-0 flex-col overflow-hidden rounded-[22px] bg-[#161616] shadow-[0_24px_80px_rgba(0,0,0,0.65)] ring-1 ring-white/10 md:h-[min(91vh,780px)] md:max-h-[min(91vh,780px,calc(100dvh-5rem))]',
          isExiting ? 'animate-tanku-modal-to-top' : 'animate-tanku-modal-from-top'
        )}
        onMouseDown={(e) => e.stopPropagation()}
        onAnimationEnd={(e) => {
          if (e.target !== e.currentTarget) return
          const name = String(e.animationName || '')
          if (!name.includes('tanku-modal-to-top')) return
          if (isExiting) finishClose()
        }}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-4 pb-3 pt-4">
          <Image
            src="/icons_tanku/mobile_tanku_icono_nueva_historia.svg"
            alt=""
            width={28}
            height={28}
            className="object-contain"
          />
          <h2 id="feed-categories-mobile-title" className="flex-1 text-lg font-semibold tracking-tight text-white">
            Categorías
          </h2>
          <button
            type="button"
            className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </header>

        <div className="border-b border-white/[0.06] px-4 py-3">
          <label className="relative flex items-center rounded-full bg-[#262626] px-4 py-2.5 ring-1 ring-white/[0.06] focus-within:ring-[#73FFA2]/35">
            <svg
              className="mr-2 h-5 w-5 shrink-0 text-white/45"
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar categoría..."
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="variant-selector-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#66DEDB]/95">Destacadas</p>
          <div className="grid grid-cols-2 gap-3">
            {featured.map((cat, i) => (
              <button
                key={`feat-${cat.id}-${i}`}
                type="button"
                className="flex min-h-[72px] items-center justify-center rounded-2xl px-3 text-center text-sm font-semibold text-white shadow-inner ring-1 ring-white/15 transition hover:brightness-110 active:scale-[0.98]"
                style={{ background: featuredGradient(i) }}
                onClick={() => {
                  onPickCategory(String(cat.id))
                  onClose()
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wide text-[#66DEDB]/95">Todas</p>
          <div className="grid grid-cols-2 gap-2">
            {filteredAll.map((cat, index) => {
              const pi = paletteIndex(cat, index)
              return (
                <button
                  key={String(cat.id)}
                  type="button"
                  className="flex min-h-[40px] max-w-full min-w-0 items-stretch overflow-hidden rounded-full text-left text-[11px] font-medium text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]"
                  style={{
                    border: `1px solid ${categoryBorder(pi)}`,
                  }}
                  onClick={() => {
                    onPickCategory(String(cat.id))
                    onClose()
                  }}
                >
                  <span
                    className="flex w-8 shrink-0 items-center justify-center overflow-hidden bg-black/30"
                    style={{ background: categoryFillLeft(pi) }}
                  >
                    {cat.image ? (
                      <Image
                        src={cat.image}
                        alt=""
                        width={22}
                        height={22}
                        className="h-5 w-5 object-cover"
                        unoptimized={isRemoteImageSrc(cat.image)}
                      />
                    ) : (
                      <span className="text-[9px] text-white/70" aria-hidden>
                        ◆
                      </span>
                    )}
                  </span>
                  <span
                    className="flex min-w-0 flex-1 items-center truncate px-1.5 py-1.5"
                    style={{ background: categoryFillRight(pi) }}
                  >
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
          {filteredAll.length === 0 && (
            <p className="py-6 text-center text-sm text-white/50">Sin resultados para «{query}»</p>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
