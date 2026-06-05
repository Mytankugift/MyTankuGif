'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useAuthStore } from '@/lib/stores/auth-store'
import { CategorySelector } from '@/components/feed/category-selector'
import { CategoryLoginModal } from '@/components/feed/category-login-modal'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'
import type { FeedNavScrollState } from '@/lib/hooks/use-feed-scroll-nav'
import { clsx } from 'clsx'
import {
  CATEGORY_SLIDER_ROW_H,
  categoryBorder,
  categoryFillLeft,
  categoryFillRight,
} from '@/components/feed/category-palette'

export interface FeedCategoryBarProps {
  categories: { id: string | number; name: string; image?: string | null }[]
  selectedCategoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
  feedNavScroll: FeedNavScrollState
}

export function FeedCategoryBar({
  categories,
  selectedCategoryId,
  onCategoryChange,
  feedNavScroll,
}: FeedCategoryBarProps) {
  const { isAuthenticated } = useAuthStore()
  const [showLoginModal, setShowLoginModal] = useState(false)

  const handleCategoryChange = (categoryId: string | null) => {
    if (!isAuthenticated && categoryId !== null) {
      setShowLoginModal(true)
    } else {
      onCategoryChange(categoryId)
    }
  }

  useEffect(() => {
    if (selectedCategoryId === null) {
      const container = document.getElementById('categories-scroll')
      if (container) {
        container.scrollTo({ left: 0, behavior: 'smooth' })
      }
    } else {
      const categoryButton = document.querySelector(
        `[data-category-id="${selectedCategoryId}"]`
      ) as HTMLElement
      if (categoryButton) {
        const container = document.getElementById('categories-scroll')
        if (container) {
          const buttonLeft = categoryButton.offsetLeft
          const buttonWidth = categoryButton.offsetWidth
          const containerWidth = container.offsetWidth

          const targetScroll = buttonLeft - containerWidth / 2 + buttonWidth / 2

          container.scrollTo({
            left: targetScroll,
            behavior: 'smooth',
          })
        }
      }
    }
  }, [selectedCategoryId])

  const { compactMid, minimalMode } = feedNavScroll

  if (categories.length === 0) {
    return null
  }

  return (
    <>
      <div
        className={clsx(
          // Sin overflow-hidden al estar visible: recortaba el panel del selector (portal o no).
          'w-full px-2 sm:px-3 md:px-4 mb-0.5 pt-0.5 transition-[max-height,opacity,transform] duration-300 ease-out',
          minimalMode
            ? 'pointer-events-none max-h-0 py-0 mb-0 opacity-0 -translate-y-2 overflow-hidden'
            : 'opacity-100 translate-y-0 overflow-visible',
          compactMid && !minimalMode && 'origin-top scale-[0.98] [will-change:transform]'
        )}
      >
        <div
          className={clsx(
            'flex w-full min-w-0 flex-row flex-nowrap items-center gap-2 overflow-hidden',
            CATEGORY_SLIDER_ROW_H
          )}
        >
          <div
            className={clsx(
              'flex shrink-0 items-stretch',
              CATEGORY_SLIDER_ROW_H
            )}
          >
            <CategorySelector
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={handleCategoryChange}
              isAuthenticated={isAuthenticated}
              onShowLoginModal={() => setShowLoginModal(true)}
            />
          </div>

          <button
            type="button"
            aria-label="Categorías anteriores"
            onClick={() => {
              const container = document.getElementById('categories-scroll')
              if (container) container.scrollBy({ left: -200, behavior: 'smooth' })
            }}
            className={clsx(
              'hidden w-7 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-[#66DEDB]/80 outline-none transition-opacity hover:text-[#66DEDB] focus:outline-none focus-visible:outline-none active:bg-transparent sm:w-8 md:inline-flex',
              CATEGORY_SLIDER_ROW_H
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div
            id="categories-scroll"
            className={clsx(
              'flex min-h-0 min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 scrollbar-hide scroll-smooth snap-x snap-mandatory',
              CATEGORY_SLIDER_ROW_H
            )}
          >
            <button
              key="all-categories"
              type="button"
              data-category-id="all"
              onClick={() => handleCategoryChange(null)}
              className={clsx(
                'group flex shrink-0 snap-start cursor-pointer items-stretch',
                CATEGORY_SLIDER_ROW_H
              )}
            >
              <div
                className={clsx(
                  'flex w-full min-w-0 items-center justify-center overflow-hidden rounded-full border px-4 transition-colors duration-200 sm:px-5',
                  CATEGORY_SLIDER_ROW_H,
                  'min-w-[80px] sm:min-w-[100px]',
                  selectedCategoryId === null
                    ? 'border-[#73FFA2] bg-white/[0.08]'
                    : 'border-white/15 bg-white/[0.06] hover:bg-white/10'
                )}
              >
                <span
                  className={clsx(
                    'text-center text-xs font-semibold leading-tight sm:text-sm',
                    selectedCategoryId === null ? 'text-[#73FFA2]' : 'text-white'
                  )}
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Todas
                </span>
              </div>
            </button>

            {categories.map((c, index) => {
              const category = {
                id: c.id,
                name: c.name,
                image: c.image || null,
                url: `/${c.name.toLowerCase().replace(/\s+/g, '-')}`,
              }
              const isSelected = selectedCategoryId === String(category.id)
              const hasImage = !!category.image

              return (
                <button
                  key={category.id}
                  type="button"
                  data-category-id={String(category.id)}
                  onClick={() => handleCategoryChange(String(category.id))}
                  className={clsx(
                    'group flex shrink-0 snap-start cursor-pointer items-stretch',
                    CATEGORY_SLIDER_ROW_H
                  )}
                >
                  <div
                    className={clsx(
                      'flex w-full min-w-0 items-stretch overflow-hidden rounded-full border transition-colors duration-200',
                      CATEGORY_SLIDER_ROW_H
                    )}
                    style={{
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: isSelected ? '#73FFA2' : categoryBorder(index),
                    }}
                  >
                    <div
                      className="flex w-[30px] shrink-0 items-center justify-center self-stretch sm:w-9"
                      style={{ backgroundColor: categoryFillLeft(index) }}
                    >
                      {hasImage && category.image ? (
                        <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full sm:h-6 sm:w-6">
                          <Image
                            src={category.image}
                            alt={category.name}
                            fill
                            sizes="24px"
                            unoptimized={isRemoteImageSrc(category.image)}
                            className="object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                    <div
                      className="flex min-h-full min-w-0 flex-1 items-center justify-center self-stretch px-2 sm:px-3"
                      style={{ backgroundColor: categoryFillRight(index) }}
                    >
                      <span
                        className={clsx(
                          'w-full truncate text-left text-xs font-semibold leading-tight sm:text-sm',
                          isSelected ? 'text-[#73FFA2]' : 'text-white'
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

          <button
            type="button"
            aria-label="Siguientes categorías"
            onClick={() => {
              const container = document.getElementById('categories-scroll')
              if (container) container.scrollBy({ left: 200, behavior: 'smooth' })
            }}
            className={clsx(
              'hidden w-7 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-[#66DEDB]/80 outline-none transition-opacity hover:text-[#66DEDB] focus:outline-none focus-visible:outline-none active:bg-transparent sm:w-8 md:inline-flex',
              CATEGORY_SLIDER_ROW_H
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
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
