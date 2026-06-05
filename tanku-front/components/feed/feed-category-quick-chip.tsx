'use client'

import React from 'react'
import { clsx } from 'clsx'
import {
  CATEGORY_CHIP_IDLE_CLASS,
  CATEGORY_CHIP_SELECTED_CLASS,
  CATEGORY_CHIP_TEXT_IDLE_CLASS,
  CATEGORY_CHIP_TEXT_SELECTED_CLASS,
  CATEGORY_SLIDER_ROW_H,
} from '@/components/feed/category-palette'
import type { FeedCategoryItem } from '@/lib/feed/category-tree'

export interface FeedCategoryQuickChipProps {
  category: FeedCategoryItem
  selected?: boolean
  onClick: () => void
}

export function FeedCategoryQuickChip({ category, selected = false, onClick }: FeedCategoryQuickChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'shrink-0 snap-start rounded-full border px-3 transition-colors duration-200',
        CATEGORY_SLIDER_ROW_H,
        selected ? CATEGORY_CHIP_SELECTED_CLASS : CATEGORY_CHIP_IDLE_CLASS
      )}
    >
      <span
        className={clsx(
          'block max-w-[7.5rem] truncate text-xs font-semibold leading-tight sm:max-w-[9rem] sm:text-sm',
          selected ? CATEGORY_CHIP_TEXT_SELECTED_CLASS : CATEGORY_CHIP_TEXT_IDLE_CLASS
        )}
        style={{ fontFamily: 'Poppins, sans-serif' }}
      >
        {category.name}
      </span>
    </button>
  )
}
