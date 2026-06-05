'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import {
  CATEGORY_CHIP_SELECTED_CLASS,
  CATEGORY_CHIP_TEXT_IDLE_CLASS,
  CATEGORY_CHIP_TEXT_SELECTED_CLASS,
  CATEGORY_ICON_IMAGE_CLASS,
  CATEGORY_TILE_IDLE_CLASS,
} from '@/components/feed/category-palette'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { apiClient } from '@/lib/api/client'
import {
  getParentCategories,
  mapCategoryFromApi,
  type FeedCategoryItem,
} from '@/lib/feed/category-tree'
import {
  tankuOrderModalBackdropClass,
  tankuOrderModalPanelClass,
} from '@/lib/ui/tanku-modal-surface'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'

export type FeedCategoryLite = FeedCategoryItem

export interface FeedCategoriesMobileModalProps {
  open: boolean
  onClose: () => void
  categories: FeedCategoryLite[]
  selectedCategoryId?: string | null
  onPickCategory: (categoryId: string | null) => void
}

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

function CategoryGridTile({
  label,
  image,
  selected,
  onClick,
}: {
  label: string
  image?: string | null
  selected: boolean
  onClick: () => void
}) {
  const isTodas = label === 'Todas' && !image

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border p-2.5 sm:gap-2.5 sm:p-3',
        selected ? CATEGORY_CHIP_SELECTED_CLASS : CATEGORY_TILE_IDLE_CLASS
      )}
    >
      {isTodas ? (
        <span
          className={clsx(
            'text-sm font-semibold sm:text-base',
            selected ? CATEGORY_CHIP_TEXT_SELECTED_CLASS : CATEGORY_CHIP_TEXT_IDLE_CLASS
          )}
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Todas
        </span>
      ) : (
        <>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center sm:h-12 sm:w-12">
            {image ? (
              <Image
                src={image}
                alt=""
                width={44}
                height={44}
                className={clsx(CATEGORY_ICON_IMAGE_CLASS, 'h-10 w-10 sm:h-11 sm:w-11')}
                unoptimized={isRemoteImageSrc(image)}
              />
            ) : (
              <span
                className={clsx(
                  'text-lg font-semibold sm:text-xl',
                  selected ? CATEGORY_CHIP_TEXT_SELECTED_CLASS : 'text-white/50'
                )}
                aria-hidden
              >
                ◆
              </span>
            )}
          </div>
          <span
            className={clsx(
              'line-clamp-2 w-full text-center text-[10px] font-semibold leading-tight sm:text-[11px]',
              selected ? CATEGORY_CHIP_TEXT_SELECTED_CLASS : CATEGORY_CHIP_TEXT_IDLE_CLASS
            )}
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {label}
          </span>
        </>
      )}
    </button>
  )
}

export function FeedCategoriesMobileModal({
  open,
  onClose,
  categories: categoriesProp,
  selectedCategoryId = null,
  onPickCategory,
}: FeedCategoriesMobileModalProps) {
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [panelVisible, setPanelVisible] = useState(open)
  const [isExiting, setIsExiting] = useState(false)
  const [allCategories, setAllCategories] = useState<FeedCategoryItem[]>(categoriesProp)
  const [isMdUp, setIsMdUp] = useState(false)
  const exitCompleteGuard = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const sync = () => setIsMdUp(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    setAllCategories(categoriesProp)
  }, [categoriesProp])

  /** Refresco al abrir: trae parentId y subcategorías desde /categories */
  useEffect(() => {
    if (!open) return
    let cancelled = false

    ;(async () => {
      try {
        const response = await apiClient.get<
          Array<{
            id: string
            name: string
            handle: string
            imageUrl?: string | null
            parentId?: string | null
            parent_id?: string | null
          }>
        >(API_ENDPOINTS.CATEGORIES.LIST)

        if (!cancelled && response.success && Array.isArray(response.data)) {
          setAllCategories(response.data.map((c) => mapCategoryFromApi(c)))
        }
      } catch {
        if (!cancelled) setAllCategories(categoriesProp)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, categoriesProp])

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

  const queryNorm = normalize(query.trim())

  const parentCategories = useMemo(() => getParentCategories(allCategories), [allCategories])

  /**
   * Móvil sin búsqueda: todas + subcategorías.
   * Desktop/tablet sin búsqueda: solo padres.
   * Con búsqueda: cualquier categoría visible.
   */
  const gridCategories = useMemo(() => {
    if (!queryNorm) return isMdUp ? parentCategories : allCategories
    return allCategories.filter((c) => normalize(c.name).includes(queryNorm))
  }, [allCategories, parentCategories, queryNorm, isMdUp])

  const showTodas = useMemo(() => {
    if (!queryNorm) return true
    return 'todas'.includes(queryNorm) || queryNorm.includes('tod')
  }, [queryNorm])

  if (!mounted || !panelVisible) return null

  const overlay = (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center px-3 pb-4 pt-[max(14px,calc(env(safe-area-inset-top)+28px))] md:px-6 md:pb-6 md:pt-[max(12px,calc(env(safe-area-inset-top)+12px))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feed-categories-mobile-title"
    >
      <div
        className={clsx('absolute inset-0', tankuOrderModalBackdropClass)}
        aria-hidden
        onMouseDown={onClose}
      />

      <div
        className={clsx(
          'relative z-10 flex h-[min(78vh,560px)] max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-24px)] w-full max-w-lg shrink-0 flex-col overflow-hidden md:h-[min(88vh,720px)] md:max-w-2xl lg:max-w-3xl',
          tankuOrderModalPanelClass,
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
        <header className="flex shrink-0 items-center gap-3 border-b border-[#414141] px-4 pb-2.5 pt-3 md:pb-3 md:pt-4">
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
        </header>

        <div className="border-b border-[#414141] px-4 py-2 md:py-3">
          <label className="relative flex items-center rounded-full border border-[#414141] bg-black/40 px-3 py-1.5 focus-within:border-[#66DEDB]/50 md:px-4 md:py-2.5">
            <svg
              className="mr-1.5 h-4 w-4 shrink-0 text-white/45 md:mr-2 md:h-5 md:w-5"
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
              className="tanku-input-text-ios w-full bg-transparent text-white placeholder:text-white/40 outline-none"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="variant-selector-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 md:pb-6 md:pt-4">
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-4 md:gap-3 lg:grid-cols-5">
            {showTodas ? (
              <CategoryGridTile
                label="Todas"
                selected={selectedCategoryId === null}
                onClick={() => {
                  onPickCategory(null)
                  onClose()
                }}
              />
            ) : null}
            {gridCategories.map((cat) => (
              <CategoryGridTile
                key={String(cat.id)}
                label={cat.name}
                image={cat.image}
                selected={selectedCategoryId === String(cat.id)}
                onClick={() => {
                  onPickCategory(String(cat.id))
                  onClose()
                }}
              />
            ))}
          </div>
          {gridCategories.length === 0 && !showTodas && (
            <p className="py-6 text-center text-sm text-white/50">Sin resultados para «{query}»</p>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
