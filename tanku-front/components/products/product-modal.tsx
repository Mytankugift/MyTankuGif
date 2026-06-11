'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { XMarkIcon } from '@heroicons/react/24/outline'
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
  onProductUpdated?: (
    productId: string,
    updates: { isLiked?: boolean; likesCount?: number; isInWishlist?: boolean },
  ) => void
  copyLinkOnShare?: boolean
}

export function ProductModal({
  product,
  isOpen,
  onClose,
  onProductUpdated,
  copyLinkOnShare = false,
}: ProductModalProps) {
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

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const handleClose = () => {
    onClose()
  }

  if (!isOpen || !product || !mounted) return null

  const modal = (
    <div
      className={clsx(
        'fixed inset-0 flex cursor-default items-center justify-center touch-manipulation p-2 sm:px-4 sm:pt-4 md:p-4 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]',
      )}
      style={{ zIndex: PRODUCT_MODAL_Z }}
      role="presentation"
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="Cerrar"
        className={clsx('absolute inset-0 touch-manipulation', tankuOrderModalBackdropClass)}
        onPointerDown={(e) => {
          e.preventDefault()
          handleClose()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClose()
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        className={clsx(
          'relative z-10 flex w-full max-w-6xl flex-col overflow-hidden',
          tankuOrderModalPanelClass,
          'max-md:max-h-[calc(100dvh-6rem-env(safe-area-inset-bottom,0px))]',
          'md:h-[580px] md:max-h-[580px]',
          'lg:h-[680px] lg:max-h-[680px]',
        )}
        style={{ borderRadius: `${TANKU_CARD_SHELL_RADIUS_PX}px` }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 border-b border-white/[0.08] bg-[#171B21]">
          <div className="flex items-center gap-2 px-4 py-3">
            <h2
              id="product-modal-title"
              className="min-w-0 flex-1 truncate text-sm font-semibold text-white md:text-center"
            >
              {product.title}
            </h2>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClose()
              }}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
              aria-label="Cerrar"
            >
              <XMarkIcon className="h-6 w-6" aria-hidden />
            </button>
          </div>
        </div>

        <div
          className={clsx(
            'tanku-modal-scrollbar flex min-h-0 flex-1 flex-col pr-0.5',
            'max-md:max-h-[calc(100dvh-6rem-env(safe-area-inset-bottom,0px)-3.25rem)]',
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
            onProductUpdated={onProductUpdated}
            copyLinkOnShare={copyLinkOnShare}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
