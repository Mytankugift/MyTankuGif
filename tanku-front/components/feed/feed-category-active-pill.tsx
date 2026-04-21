'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import { clsx } from 'clsx'
import {
  CATEGORY_PALETTE_RGB,
  categoryBorder,
  categoryFillLeft,
  categoryFillLeftCompact,
  categoryFillRight,
  categoryFillRightCompact,
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

function paletteIndex(cat: FeedCategoryActivePillCategory): number {
  const s = `${cat.id}:${cat.name}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % 9973
  return h % CATEGORY_PALETTE_RGB.length
}

export function FeedCategoryActivePill({ category, onClear, className, compact = false }: FeedCategoryActivePillProps) {
  const pi = useMemo(() => paletteIndex(category), [category])
  const fillLeft = compact ? categoryFillLeftCompact(pi) : categoryFillLeft(pi)
  const fillRight = compact ? categoryFillRightCompact(pi) : categoryFillRight(pi)

  return (
    <div className={clsx('flex w-full justify-start', compact ? 'pl-0 pr-0' : 'pl-0.5 pr-2', className)}>
      <div
        className={clsx(
          'flex min-w-0 shrink-0 items-stretch overflow-hidden rounded-full shadow-md',
          compact
            ? 'max-w-[min(168px,calc(100vw-3.5rem))]'
            : 'max-w-[min(220px,calc(100vw-5rem))]'
        )}
        style={{ border: `1px solid ${categoryBorder(pi)}` }}
      >
        <div
          className={clsx(
            'flex shrink-0 items-center justify-center border-r border-white/10 bg-[#0d0d0f]',
            compact ? 'w-7' : 'w-9'
          )}
          style={{ background: `linear-gradient(180deg, #0d0d0f 0%, ${fillLeft} 100%)` }}
        >
          {category.image ? (
            <Image
              src={category.image}
              alt=""
              width={compact ? 18 : 22}
              height={compact ? 18 : 22}
              className={clsx('rounded object-cover', compact ? 'h-4 w-4' : 'h-5 w-5')}
              unoptimized={isRemoteImageSrc(category.image)}
            />
          ) : (
            <span className={clsx('text-[#66DEDB]', compact ? 'text-xs' : 'text-sm')} aria-hidden>
              ◆
            </span>
          )}
        </div>
        <div
          className={clsx(
            'flex min-w-0 flex-1 items-center gap-0.5 py-1 pl-1.5 pr-0.5',
            compact ? 'max-w-[118px]' : 'max-w-[160px] gap-1 py-1.5 pl-2 pr-1 sm:max-w-[180px]'
          )}
          style={{ background: fillRight }}
        >
          <span
            className={clsx(
              'min-w-0 flex-1 truncate font-semibold text-white',
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
