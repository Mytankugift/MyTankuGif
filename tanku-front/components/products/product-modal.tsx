'use client'

import React from 'react'
import { ProductDetailContent } from './product-detail-content'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { FeedItemDTO } from '@/types/api'

interface ProductModalProps {
  product: FeedItemDTO | null
  isOpen: boolean
  onClose: () => void
}

export function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  if (!isOpen || !product) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
      onMouseDown={(e) => {
        // Solo cerrar si el click es directamente en el overlay, no en un hijo
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      style={{ 
        zIndex: 9999, 
        cursor: 'default',
        userSelect: 'none'
      }}
    >
      <div
        className="w-full max-w-6xl h-full max-h-[95vh] sm:max-h-[92vh] overflow-hidden flex flex-col relative"
        style={{ 
          backgroundColor: '#2C3137',
          border: '2px solid #66DEDB',
          borderRadius: '25px',
          cursor: 'default',
          userSelect: 'auto'
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
}
