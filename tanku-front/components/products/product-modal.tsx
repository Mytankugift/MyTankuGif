'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductDetailContent } from './product-detail-content'
import { EllipsisVerticalIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { FeedItemDTO } from '@/types/api'

interface ProductModalProps {
  product: FeedItemDTO | null
  isOpen: boolean
  onClose: () => void
}

export function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuRef])

  if (!isOpen || !product) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-lg sm:rounded-2xl w-full max-w-6xl h-full max-h-[95vh] sm:max-h-[92vh] overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con menú de 3 puntos y botón cerrar */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
          <div></div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
                aria-label="Opciones"
              >
                <EllipsisVerticalIcon className="w-6 h-6" />
              </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
                <button
                  onClick={() => {
                    router.push(`/products/${product.handle}`)
                    setShowMenu(false)
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  Ir a publicación
                </button>
              </div>
            )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
              aria-label="Cerrar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido usando componente compartido */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          <ProductDetailContent
            product={product}
            isPageView={false}
          />
        </div>
      </div>
    </div>
  )
}
