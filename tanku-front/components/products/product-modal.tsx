'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { ProductDetailContent } from './product-detail-content'
import { TANKU_CARD_SHELL_RADIUS_PX } from '@/lib/utils/tanku-card-radius'
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  const handleClose = () => {
    onClose()
  }

  if (!isOpen || !product || !mounted) return null

  const modal = (
    <div
      className="pointer-events-none fixed inset-0 isolate flex items-center justify-center p-2 sm:px-4 sm:pt-4 md:p-4 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
      style={{ zIndex: PRODUCT_MODAL_Z }}
      role="presentation"
    >
      <div
        className={clsx(
          'pointer-events-auto absolute inset-0 cursor-default touch-manipulation',
          tankuOrderModalBackdropClass,
        )}
        aria-hidden
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        className={clsx(
          'pointer-events-auto relative z-10 flex w-full max-w-6xl flex-col overflow-hidden',
          tankuOrderModalPanelClass,
          'max-md:max-h-[calc(100dvh-4rem-env(safe-area-inset-bottom,0px))]',
          'md:h-[580px] md:max-h-[580px]',
          'lg:h-[680px] lg:max-h-[680px]',
        )}
        style={{ borderRadius: `${TANKU_CARD_SHELL_RADIUS_PX}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 border-b border-white/[0.08] bg-[#171B21]">
          <div className="flex items-center justify-center px-4 py-3">
            <h2
              id="product-modal-title"
              className="min-w-0 truncate text-center text-sm font-semibold text-white"
            >
              {product.title}
            </h2>
          </div>
        </div>

        <div
          className={clsx(
            'tanku-modal-scrollbar flex min-h-0 flex-1 flex-col pr-0.5',
            'max-md:max-h-[calc(100dvh-4rem-env(safe-area-inset-bottom,0px)-3.25rem)]',
            'max-md:touch-pan-y max-md:overflow-x-hidden max-md:overflow-y-auto max-md:overscroll-y-contain max-md:[-webkit-overflow-scrolling:touch]',
            'md:min-h-0 md:flex-1 md:touch-pan-y md:overflow-x-hidden md:overflow-y-auto md:overscroll-y-contain',
          )}
          style={{
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <ProductDetailContent
            product={product}
            isPageView={false}
            onAgeRestrictedClose={handleClose}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
