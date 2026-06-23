'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth-store'
import { CategoryLoginModal } from '@/components/feed/category-login-modal'
import { FeedCategoryBarChip } from '@/components/feed/feed-category-bar-chip'
import type { FeedNavScrollState } from '@/lib/hooks/use-feed-scroll-nav'
import { useHorizontalChipScroll } from '@/lib/hooks/use-horizontal-chip-scroll'
import { getCategoryBarChips, type FeedCategoryItem } from '@/lib/feed/category-tree'
import { clsx } from 'clsx'
import {
  CATEGORY_CHIP_SELECTED_CLASS,
  CATEGORY_CHIP_TEXT_SELECTED_CLASS,
  CATEGORY_SLIDER_ROW_H,
} from '@/components/feed/category-palette'

export interface FeedCategoryBarProps {
  categories: FeedCategoryItem[]
  selectedCategoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
  feedNavScroll: FeedNavScrollState
  /** Abre el modal de categorías (desktop/tablet) */
  onOpenCategoriesModal?: () => void
}

export function FeedCategoryBar({
  categories,
  selectedCategoryId,
  onCategoryChange,
  feedNavScroll,
  onOpenCategoriesModal,
}: FeedCategoryBarProps) {
  const { isAuthenticated } = useAuthStore()
  const [showLoginModal, setShowLoginModal] = useState(false)

  const { compactMid, minimalMode } = feedNavScroll

  const barChips = useMemo(
    () => getCategoryBarChips(categories, selectedCategoryId),
    [categories, selectedCategoryId]
  )

  const {
    scrollRef,
    hasOverflow,
    canScrollLeft,
    canScrollRight,
    scrollByPage,
    scrollChipFullyVisible,
  } = useHorizontalChipScroll(selectedCategoryId, barChips.length)

  const pickCategory = (categoryId: string | null) => {
    if (!isAuthenticated && categoryId !== null) {
      setShowLoginModal(true)
      return
    }
    onCategoryChange(categoryId)
    if (categoryId) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollChipFullyVisible(categoryId))
      })
    }
  }

  if (categories.length === 0) {
    return null
  }

  return (
    <>
      <div
        className={clsx(
          'w-full px-2 sm:px-3 md:px-4 mb-0.5 pt-0.5 transition-[max-height,opacity,transform] duration-300 ease-out',
          minimalMode
            ? 'pointer-events-none max-h-0 py-0 mb-0 opacity-0 -translate-y-2 overflow-hidden'
            : 'opacity-100 translate-y-0 overflow-visible',
          compactMid && !minimalMode && 'origin-top scale-[0.98] [will-change:transform]'
        )}
      >
        <div
          className={clsx(
            'flex w-full min-w-0 flex-row flex-nowrap items-center gap-3 md:gap-4',
            CATEGORY_SLIDER_ROW_H
          )}
        >
          {onOpenCategoriesModal ? (
            <button
              type="button"
              onClick={onOpenCategoriesModal}
              className={clsx(
                'flex shrink-0 cursor-pointer items-center gap-2 border-0 bg-transparent px-1.5 pr-2 text-white outline-none transition-[color] duration-200 hover:text-white/90 md:pr-3',
                CATEGORY_SLIDER_ROW_H
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Image
                src="/icons_tanku/mobile_tanku_icono_nueva_historia.svg"
                alt=""
                width={22}
                height={22}
                className="h-[22px] w-[22px] shrink-0 object-contain"
                unoptimized
              />
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
                className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5"
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
          ) : null}

          <div className="relative min-w-0 flex-1 items-center md:flex">
            <div
              ref={scrollRef}
              className="flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto pb-0.5 scrollbar-hide sm:gap-3 md:gap-3.5 md:overflow-x-hidden md:px-1"
            >
              {barChips.length > 0 ? (
                barChips.map((chip) => (
                  <FeedCategoryBarChip
                    key={String(chip.category.id)}
                    category={chip.category}
                    selected={chip.selected}
                    onSelect={() => pickCategory(String(chip.category.id))}
                    onClear={() => pickCategory(null)}
                  />
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => pickCategory(null)}
                  data-category-chip-id="all"
                  className={clsx(
                    'shrink-0 rounded-full border px-4 transition-colors duration-200 sm:px-5',
                    CATEGORY_SLIDER_ROW_H,
                    'min-w-[84px] sm:min-w-[104px]',
                    CATEGORY_CHIP_SELECTED_CLASS
                  )}
                >
                  <span
                    className={clsx(
                      'text-center text-xs font-semibold leading-tight sm:text-sm',
                      CATEGORY_CHIP_TEXT_SELECTED_CLASS
                    )}
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    Todas
                  </span>
                </button>
              )}
            </div>

            {/* Flechas superpuestas (desktop): translúcidas si hay scroll; desaparecen en el extremo */}
            <div
              className={clsx(
                'pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-11 transition-opacity duration-300 md:block',
                hasOverflow && canScrollLeft ? 'opacity-100' : 'opacity-0',
              )}
              aria-hidden={!(hasOverflow && canScrollLeft)}
            >
              <div className="absolute inset-y-0 left-0 w-11 bg-gradient-to-r from-[#191E23]/75 via-[#191E23]/40 to-transparent" />
              <button
                type="button"
                onClick={() => scrollByPage(-1)}
                className="pointer-events-auto absolute left-0 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#73FFA2]/40 bg-[#2a2f34]/55 text-[#73FFA2]/85 backdrop-blur-[2px] transition-[opacity,background-color,border-color] duration-300 hover:border-[#73FFA2]/60 hover:bg-[#2a2f34]/75 hover:text-[#73FFA2]"
                aria-label="Ver categorías anteriores"
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div
              className={clsx(
                'pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-11 transition-opacity duration-300 md:block',
                hasOverflow && canScrollRight ? 'opacity-100' : 'opacity-0',
              )}
              aria-hidden={!(hasOverflow && canScrollRight)}
            >
              <div className="absolute inset-y-0 right-0 w-11 bg-gradient-to-l from-[#191E23]/75 via-[#191E23]/40 to-transparent" />
              <button
                type="button"
                onClick={() => scrollByPage(1)}
                className="pointer-events-auto absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#73FFA2]/40 bg-[#2a2f34]/55 text-[#73FFA2]/85 backdrop-blur-[2px] transition-[opacity,background-color,border-color] duration-300 hover:border-[#73FFA2]/60 hover:bg-[#2a2f34]/75 hover:text-[#73FFA2]"
                aria-label="Ver más categorías"
              >
                <ChevronRightIcon className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>

      <CategoryLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => {
          setShowLoginModal(false)
        }}
      />
    </>
  )
}
