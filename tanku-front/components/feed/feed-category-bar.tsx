'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useAuthStore } from '@/lib/stores/auth-store'
import { CategoryLoginModal } from '@/components/feed/category-login-modal'
import { FeedCategoryBarChip } from '@/components/feed/feed-category-bar-chip'
import type { FeedNavScrollState } from '@/lib/hooks/use-feed-scroll-nav'
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

  const pickCategory = (categoryId: string | null) => {
    if (!isAuthenticated && categoryId !== null) {
      setShowLoginModal(true)
      return
    }
    onCategoryChange(categoryId)
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
            'flex w-full min-w-0 flex-row flex-nowrap items-center gap-2',
            CATEGORY_SLIDER_ROW_H
          )}
        >
          {onOpenCategoriesModal ? (
            <button
              type="button"
              onClick={onOpenCategoriesModal}
              className={clsx(
                'flex shrink-0 cursor-pointer items-center gap-2 border-0 bg-transparent px-1.5 text-white outline-none transition-[color] duration-200 hover:text-white/90',
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

          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
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
                className={clsx(
                  'shrink-0 rounded-full border px-4 transition-colors duration-200',
                  CATEGORY_SLIDER_ROW_H,
                  'min-w-[80px] sm:min-w-[100px]',
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
