'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { ProductDetailContent } from './product-detail-content'
import {
  tankuOrderModalBackdropClass,
  tankuOrderModalPanelClass,
} from '@/lib/ui/tanku-modal-surface'
import type { FeedItemDTO } from '@/types/api'

const PRODUCT_MODAL_Z = 1000003

interface ProductModalProps {
  product: FeedItemDTO | null
  isOpen: boolean
  onClose: () => void
}

export function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  if (!isOpen || !product) return null
  if (typeof document === 'undefined') return null

  const modal = (
    <div
      className="fixed inset-0 isolate flex items-center justify-center p-2 sm:p-3 md:p-4 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
      style={{ zIndex: PRODUCT_MODAL_Z }}
      role="presentation"
    >
      <div
        className={clsx('absolute inset-0', tankuOrderModalBackdropClass)}
        aria-hidden
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        className={clsx(
          'relative z-10 flex w-full max-w-6xl flex-col overflow-hidden',
          tankuOrderModalPanelClass,
          'max-md:max-h-[calc(100dvh-1rem-env(safe-area-inset-bottom,0px))]',
          'md:max-h-[min(75vh,580px)] lg:max-h-[min(88vh,900px)]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 border-b border-white/[0.08] bg-[#171B21]">
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="h-9 w-9 flex-shrink-0" aria-hidden />
            <h2
              id="product-modal-title"
              className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-white"
            >
              {product.title}
            </h2>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
              aria-label="Cerrar"
            >
              <XMarkIcon className="h-6 w-6" aria-hidden />
            </button>
          </div>
        </div>

        <div
          className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto max-md:max-h-[calc(100dvh-1rem-env(safe-area-inset-bottom,0px)-4.5rem)] md:max-h-[calc(min(75vh,580px)-4.5rem)] lg:max-h-[calc(min(88vh,900px)-4.5rem)]"
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <ProductDetailContent
            product={product}
            isPageView={false}
            onAgeRestrictedClose={onClose}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
