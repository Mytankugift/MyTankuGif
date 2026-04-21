'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { ProductDetailContent } from './product-detail-content'
import { XMarkIcon } from '@heroicons/react/24/outline'
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
      className="fixed inset-0 flex items-center justify-center bg-black/75 px-2 py-2 sm:px-4 sm:pt-4 md:p-4"
      onClick={onClose}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      style={{
        zIndex: PRODUCT_MODAL_Z,
        cursor: 'default',
        userSelect: 'none',
      }}
      role="presentation"
    >
      <div
        className="relative flex h-auto w-full max-w-6xl flex-col overflow-hidden max-md:max-h-[calc(100dvh-1rem-env(safe-area-inset-bottom,0px))] md:max-h-[min(75vh,580px)] lg:max-h-[min(88vh,900px)]"
        style={{
          backgroundColor: '#2C3137',
          border: '2px solid #66DEDB',
          borderRadius: '25px',
          cursor: 'default',
          userSelect: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header con nombre del producto y botón cerrar */}
        <div className="flex-shrink-0 flex items-center justify-between pt-2 pb-1 px-4">
          <h2 
            className="text-lg sm:text-xl font-semibold pl-2 pt-4"
            style={{ color: '#66DEDB' }}
          >
            {product.title}
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="p-1.5 hover:opacity-80 transition-opacity"
            aria-label="Cerrar"
            style={{ color: '#66DEDB' }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido usando componente compartido */}
        <div 
          className="min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar max-md:max-h-[calc(100dvh-1rem-env(safe-area-inset-bottom,0px)-7rem)] md:max-h-[calc(min(75vh,580px)-6.5rem)] lg:max-h-[calc(min(88vh,900px)-6.5rem)]"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
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
