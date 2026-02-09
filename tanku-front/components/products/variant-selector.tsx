'use client'

import React, { useState, useEffect, useRef } from 'react'
import type { ProductVariantDTO } from '@/types/api'

interface VariantSelectorProps {
  variants: ProductVariantDTO[]
  selectedVariant: ProductVariantDTO | null
  onVariantChange: (variant: ProductVariantDTO) => void
  formatPrice: (price: number) => string
}

export function VariantSelector({
  variants,
  selectedVariant,
  onVariantChange,
  formatPrice,
}: VariantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const sortedVariants = [...variants].sort((a, b) => {
    const titleA = (a.title || '').toLowerCase()
    const titleB = (b.title || '').toLowerCase()
    return titleA.localeCompare(titleB)
  })

  const selectedVariantTitle = selectedVariant?.title || sortedVariants[0]?.title || 'Seleccionar variante'

  // Calcular precio con incremento (15% + $10,000)
  const getVariantPrice = (variant: ProductVariantDTO) => {
    // Usar tankuPrice directamente (ya calculado en sync)
    return variant.tankuPrice || 0
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left transition-all duration-200 flex items-center justify-between hover:opacity-80 focus:outline-none"
        style={{
          backgroundColor: 'transparent',
          border: '2px solid #66DEDB',
          borderRadius: '25px'
        }}
      >
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 mb-1">Variante seleccionada:</span>
          <span className="text-sm font-semibold text-[#66DEDB]">{selectedVariantTitle}</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="12"
          viewBox="0 0 20 12"
          fill="none"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path
            d="M2 2L10 10L18 2"
            stroke="#66DEDB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-full shadow-2xl z-50 p-3 max-h-64 overflow-y-auto"
          style={{
            backgroundColor: '#2C3137',
            border: '2px solid #66DEDB',
            borderRadius: '25px'
          }}
        >
          {sortedVariants.map((variant, index) => {
            const isSelected = selectedVariant?.id === variant.id
            const variantPrice = getVariantPrice(variant)

            return (
              <button
                key={variant.id || index}
                onClick={() => {
                  onVariantChange(variant)
                  setIsOpen(false)
                }}
                className={`w-full mb-2 last:mb-0 px-4 py-3 rounded-lg transition-all duration-200 text-left border-2 ${
                  isSelected
                    ? 'bg-[#66DEDB]/20 border-[#66DEDB]'
                    : 'bg-gray-700/50 border-transparent hover:bg-gray-700 hover:border-[#66DEDB]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isSelected ? 'text-[#66DEDB]' : 'text-gray-300'}`}>
                    {variant.title || `Variante ${index + 1}`}
                  </span>
                  {variantPrice > 0 && (
                    <span className="text-xs text-gray-400 ml-2">{formatPrice(variantPrice)}</span>
                  )}
                </div>
                {isSelected && (
                  <div className="mt-1 text-xs text-[#66DEDB] opacity-75">✓ Seleccionada</div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

