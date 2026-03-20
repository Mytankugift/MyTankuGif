'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ProductDetailContent } from './product-detail-content'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { FeedItemDTO } from '@/types/api'

const PRODUCT_MODAL_Z = 10050

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

  if (!isOpen || !product || !mounted) return null

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/75 px-2 pt-2 max-md:pb-[max(0.5rem,calc(4.75rem+env(safe-area-inset-bottom,0px)))] sm:px-4 sm:pt-4 md:p-4"
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
        className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden max-md:max-h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px))] md:max-h-[92vh]"
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
          className="flex-1 overflow-y-auto min-h-0 custom-scrollbar"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            paddingBottom: '40px', // Espacio extra en móvil para ver todo el contenido
            WebkitOverflowScrolling: 'touch', // Mejor scroll en iOS
          }}
        >
          <ProductDetailContent
            product={product}
            isPageView={false}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
