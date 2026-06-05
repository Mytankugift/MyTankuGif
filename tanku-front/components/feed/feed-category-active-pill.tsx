'use client'

import React from 'react'
import Image from 'next/image'
import { clsx } from 'clsx'
import {
  CATEGORY_ICON_IMAGE_CLASS,
  CATEGORY_ICON_SHELL_CLASS,
  CATEGORY_CHIP_SELECTED_SOLID_CLASS,
  CATEGORY_CHIP_TEXT_SELECTED_CLASS,
} from '@/components/feed/category-palette'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'

export interface FeedCategoryActivePillCategory {
  id: string | number
  name: string
  image?: string | null
}

export interface FeedCategoryActivePillProps {
  category: FeedCategoryActivePillCategory
  onClear: () => void
  className?: string
  /** Pastilla más pequeña (p. ej. flotante móvil) */
  compact?: boolean
}

export function FeedCategoryActivePill({ category, onClear, className, compact = false }: FeedCategoryActivePillProps) {
  return (
    <div className={clsx('flex w-full justify-start', compact ? 'pl-0 pr-0' : 'pl-0.5 pr-2', className)}>
      <div
        className={clsx(
          'flex w-max max-w-full shrink-0 items-stretch overflow-hidden rounded-full border',
          CATEGORY_CHIP_SELECTED_SOLID_CLASS,
          compact && 'max-w-[calc(100vw-1.5rem)]'
        )}
      >
        <div
          className={clsx(
            'flex shrink-0 items-center justify-center px-1',
            compact ? 'w-9' : 'w-11',
          )}
        >
          {category.image ? (
            <span className={clsx(CATEGORY_ICON_SHELL_CLASS, compact && 'h-6 w-6 rounded-[6px] p-0.5 sm:h-6 sm:w-6')}>
              <Image
                src={category.image}
                alt=""
                width={compact ? 22 : 28}
                height={compact ? 22 : 28}
                className={CATEGORY_ICON_IMAGE_CLASS}
                unoptimized={isRemoteImageSrc(category.image)}
              />
            </span>
          ) : (
            <span className={clsx('text-[#66DEDB]', compact ? 'text-xs' : 'text-sm')} aria-hidden>
              ◆
            </span>
          )}
        </div>
        <div
          className={clsx(
            'flex min-w-0 items-center gap-0.5 py-1 pl-2 pr-0.5',
            compact ? 'pr-1' : 'gap-1 py-1.5 pl-2.5 pr-1'
          )}
        >
          <span
            className={clsx(
              'whitespace-nowrap font-semibold',
              CATEGORY_CHIP_TEXT_SELECTED_CLASS,
              compact ? 'text-[11px] leading-tight' : 'text-xs sm:text-[13px]'
            )}
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {category.name}
          </span>
          <button
            type="button"
            className={clsx(
              'flex shrink-0 items-center justify-center rounded-full leading-none text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#66DEDB]',
              compact ? 'h-6 w-6 text-base' : 'h-7 w-7 text-lg'
            )}
            aria-label="Quitar filtro de categoría"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClear()
            }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
