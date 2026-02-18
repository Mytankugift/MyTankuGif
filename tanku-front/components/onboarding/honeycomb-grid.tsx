/**
 * Componente de panal de abejas (hexágonos) mejorado
 * Layout usando CSS Grid - más robusto y preciso
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface HoneycombItem {
  slug: string
  label: string
  emoji?: string
}

interface HoneycombGridProps {
  items: HoneycombItem[]
  selectedSlugs: string[]
  onToggle: (slug: string) => void
  minSelection?: number
  maxSelection?: number
  allowMultiple?: boolean
  showEmoji?: boolean
  pattern?: '4-3' | '4-5' // Patrón: 4-3-4-3 o 4-5-4-5
}

/**
 * Hexágono individual
 */
function HoneycombHexagon({
  item,
  isSelected,
  onClick,
  disabled,
  showEmoji = true,
}: {
  item: HoneycombItem
  isSelected: boolean
  onClick: () => void
  disabled: boolean
  showEmoji?: boolean
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative
        w-[72px] h-[88px] sm:w-[88px] sm:h-[104px]
        flex items-center justify-center
        transition-colors duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      }}
    >
      {/* Fondo del hexágono */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          backgroundColor: isSelected ? '#73FFA2' : 'transparent',
        }}
      />
      {/* Borde SVG completo - siempre visible con el mismo grosor */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ zIndex: 1, overflow: 'visible' }}
      >
        <polygon
          points="50,0 100,25 100,75 50,100 0,75 0,25"
          fill="none"
          stroke="#73FFA2"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      
      <div 
        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-0.5"
      >
        {item.emoji && showEmoji && (
          <span
            className="text-xl sm:text-2xl"
            role="img"
            aria-label={item.label}
          >
            {item.emoji}
          </span>
        )}
        <span
          className="text-[10px] sm:text-xs font-medium text-center px-1 leading-tight"
          style={{
            color: isSelected ? '#262626' : '#66DEDB',
            fontWeight: isSelected ? 'bold' : 'normal',
          }}
        >
          {item.label}
        </span>
      </div>
    </motion.button>
  )
}

/**
 * Organiza los items en filas y calcula información de cada uno
 */
function organizeItemsInRows<T>(
  items: T[],
  firstRowCount: number,
  secondRowCount: number
): Array<{ item: T | null; index: number; rowIndex: number; shouldOffset: boolean }> {
  const result: Array<{ item: T | null; index: number; rowIndex: number; shouldOffset: boolean }> = []
  let currentRow = 0
  let currentIndex = 0
  
  while (currentIndex < items.length) {
    const isEvenRow = currentRow % 2 === 0
    const itemsInRow = isEvenRow ? firstRowCount : secondRowCount
    const rowItems = items.slice(currentIndex, currentIndex + itemsInRow)
    
    // Si es la última fila y tiene menos items de los esperados, agregar espacios vacíos
    const isLastRow = currentIndex + rowItems.length >= items.length
    if (isLastRow && rowItems.length < itemsInRow) {
      while (rowItems.length < itemsInRow) {
        rowItems.push(null as any)
      }
    }
    
    rowItems.forEach((item, itemIndexInRow) => {
      result.push({
        item,
        index: currentIndex + itemIndexInRow,
        rowIndex: currentRow,
        shouldOffset: !isEvenRow, // Las filas impares (1, 3, 5...) se desplazan
      })
    })
    
    currentIndex += itemsInRow
    currentRow++
  }
  
  return result
}

/**
 * Grid principal de panal usando CSS Grid
 */
export function HoneycombGrid({
  items,
  selectedSlugs,
  onToggle,
  minSelection = 0,
  maxSelection,
  allowMultiple = true,
  showEmoji = true,
  pattern = '4-3', // Por defecto 4-3-4-3
}: HoneycombGridProps) {
  const canSelectMore = maxSelection ? selectedSlugs.length < maxSelection : true
  const canDeselect = minSelection ? selectedSlugs.length > minSelection : true

  // Configuración del patrón
  const [firstRowCount, secondRowCount] = pattern === '4-3' ? [4, 3] : [4, 5]
  
  // Calcular el ancho de cada columna (hexágono ocupa 2 columnas)
  const hexWidth = 72 // w-[72px] en mobile
  const columnWidth = hexWidth / 2 // 36px por columna
  
  // Calcular cuántas columnas necesitamos (máximo entre primera y segunda fila)
  const maxItemsPerRow = Math.max(firstRowCount, secondRowCount)
  const totalColumns = maxItemsPerRow * 2 // Cada hexágono ocupa 2 columnas

  // Organizar items en filas con información de posición
  const itemsWithRowInfo = organizeItemsInRows(items, firstRowCount, secondRowCount)

  // Agrupar items por fila para calcular la posición en el grid
  const itemsByRow = itemsWithRowInfo.reduce((acc, itemInfo) => {
    if (!acc[itemInfo.rowIndex]) {
      acc[itemInfo.rowIndex] = []
    }
    acc[itemInfo.rowIndex].push(itemInfo)
    return acc
  }, {} as Record<number, typeof itemsWithRowInfo>)

  return (
    <div 
      className="w-full max-w-4xl mx-auto p-2 sm:p-4"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0',
      }}
    >
      {Object.entries(itemsByRow).map(([rowIndexStr, rowItems]) => {
        const rowIndex = parseInt(rowIndexStr)
        const shouldOffset = rowIndex % 2 === 1 // Filas impares se desplazan
        const itemsInRow = rowItems.length
        const isEvenRow = rowIndex % 2 === 0
        
        // Calcular el ancho total de la fila
        const rowWidth = itemsInRow * hexWidth
        
        return (
          <div
            key={rowIndex}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: rowIndex > 0 ? '-28px' : '0',
              gap: '0',
              width: '100%',
              transform: shouldOffset ? `translateX(${0}px)` : 'none',
            }}
          >
            {rowItems.map(({ item, index, shouldOffset: itemShouldOffset }) => {
              // Si el item es null (espacio vacío), renderizar un div invisible
              if (!item) {
                return (
                  <div
                    key={`empty-${rowIndex}-${index}`}
                    style={{
                      width: '72px',
                      height: '88px',
                      visibility: 'hidden',
                      margin: '0 8.5px',
                    }}
                  />
                )
              }
              
              const isSelected = selectedSlugs.includes(item.slug)
              const disabled =
                !allowMultiple ||
                (!isSelected && !canSelectMore) ||
                (isSelected && !canDeselect)
              
              // Calcular el margen para que se traslapen correctamente
              // En filas de 4, necesitan más espacio para traslaparse
              const margin = isEvenRow && firstRowCount === 4 ? '0 0px' : '0 0px'
              
              return (
                <div
                  key={item.slug}
                  style={{
                    margin,
                  }}
                >
                  <HoneycombHexagon
                    item={item}
                    isSelected={isSelected}
                    onClick={() => {
                      if (isSelected && canDeselect) onToggle(item.slug)
                      else if (!isSelected && canSelectMore) onToggle(item.slug)
                    }}
                    disabled={disabled}
                    showEmoji={showEmoji}
                  />
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
