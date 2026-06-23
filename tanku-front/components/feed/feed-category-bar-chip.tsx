'use client'

import React from 'react'
import Image from 'next/image'
import { clsx } from 'clsx'
import {
  CATEGORY_CHIP_IDLE_CLASS,
  CATEGORY_CHIP_SELECTED_SOLID_CLASS,
  CATEGORY_CHIP_TEXT_IDLE_CLASS,
  CATEGORY_CHIP_TEXT_SELECTED_CLASS,
  CATEGORY_ICON_IMAGE_CLASS,
  CATEGORY_ICON_SHELL_CLASS,
  CATEGORY_SLIDER_ROW_H,
} from '@/components/feed/category-palette'
import type { FeedCategoryItem } from '@/lib/feed/category-tree'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'

export interface FeedCategoryBarChipProps {
  category: FeedCategoryItem
  selected?: boolean
  onSelect: () => void
  onClear?: () => void
}

/** Chip unificado: icono + nombre; misma caja con o sin selección (no salta al cambiar). */
export function FeedCategoryBarChip({
  category,
  selected = false,
  onSelect,
  onClear,
}: FeedCategoryBarChipProps) {
  return (
    <div
      data-category-chip-id={String(category.id)}
      className={clsx(
        'flex shrink-0 snap-start items-stretch overflow-hidden rounded-full border transition-colors duration-200',
        CATEGORY_SLIDER_ROW_H,
        selected ? CATEGORY_CHIP_SELECTED_SOLID_CLASS : CATEGORY_CHIP_IDLE_CLASS
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className={clsx(
          'flex min-w-0 items-center gap-1.5 self-stretch py-0 pl-1.5 sm:gap-2 sm:pl-2',
          selected ? 'pr-0.5' : 'flex-1 pr-0',
        )}
      >
        <span className={clsx(CATEGORY_ICON_SHELL_CLASS, 'h-6 w-6 p-0.5 sm:h-7 sm:w-7')}>
          {category.image ? (
            <Image
              src={category.image}
              alt=""
              width={24}
              height={24}
              className={CATEGORY_ICON_IMAGE_CLASS}
              unoptimized={isRemoteImageSrc(category.image)}
            />
          ) : (
            <span
              className={clsx(
                'text-[10px] font-semibold sm:text-xs',
                selected ? CATEGORY_CHIP_TEXT_SELECTED_CLASS : 'text-white/45'
              )}
              aria-hidden
            >
              ◆
            </span>
          )}
        </span>
        <span
          className={clsx(
            'whitespace-nowrap text-xs font-semibold leading-tight sm:text-sm',
            selected ? CATEGORY_CHIP_TEXT_SELECTED_CLASS : CATEGORY_CHIP_TEXT_IDLE_CLASS
          )}
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          {category.name}
        </span>
      </button>
      {selected ? (
        <button
          type="button"
          className="flex w-7 shrink-0 items-center justify-center self-stretch text-base leading-none text-white transition-colors hover:text-[#73FFA2] focus:outline-none sm:w-8 sm:text-lg"
          aria-label="Quitar filtro de categoría"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClear?.()
          }}
        >
          <span className="block -translate-y-px leading-none" aria-hidden>
            ×
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          className="flex w-7 shrink-0 cursor-pointer items-center justify-center self-stretch sm:w-8"
          aria-label={`Seleccionar ${category.name}`}
        />
      )}
    </div>
  )
}
