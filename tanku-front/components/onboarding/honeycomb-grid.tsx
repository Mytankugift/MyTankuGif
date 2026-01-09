/**
 * Componente de panal de abejas (hexágonos) mejorado
 * Layout específico: 4-5-4 (filas alternas desplazadas)
 * Escalable para agregar más opciones
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
}

/**
 * Organiza los items en filas tipo panal: 4-5-4-5-4...
 * Las filas pares (índice impar) están desplazadas
 */
function organizeInHoneycombRows<T>(items: T[]): T[][] {
  const rows: T[][] = []
  let currentIndex = 0

  while (currentIndex < items.length) {
    // Filas impares (0, 2, 4...) tienen 4 items
    // Filas pares (1, 3, 5...) tienen 5 items
    const isEvenRow = rows.length % 2 === 0
    const itemsInRow = isEvenRow ? 4 : 5
    const row = items.slice(currentIndex, currentIndex + itemsInRow)
    
    if (row.length > 0) {
      rows.push(row)
    }
    
    currentIndex += itemsInRow
  }

  return rows
}

/**
 * Hexágono individual
 */
function HoneycombHexagon({
  item,
  isSelected,
  onClick,
  disabled,
}: {
  item: HoneycombItem
  isSelected: boolean
  onClick: () => void
  disabled: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative
        w-[72px] h-[88px] sm:w-[88px] sm:h-[104px]
        flex flex-col items-center justify-center
        transition-all duration-300
        ${isSelected ? 'scale-105 z-10' : 'scale-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      }}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: isSelected ? 1.05 : 1,
        backgroundColor: isSelected
          ? '#73FFA2'
          : isHovered && !disabled
            ? 'rgba(115, 255, 162, 0.3)'
            : 'rgba(115, 255, 162, 0.1)',
        borderColor: isSelected
          ? '#73FFA2'
          : isHovered && !disabled
            ? 'rgba(115, 255, 162, 0.6)'
            : 'rgba(115, 255, 162, 0.3)',
      }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="absolute inset-0"
        style={{
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          border: '2px solid',
          borderColor: isSelected
            ? '#73FFA2'
            : isHovered && !disabled
              ? 'rgba(115, 255, 162, 0.6)'
              : 'rgba(115, 255, 162, 0.3)',
          borderRadius: '4px',
        }}
      />
      
      <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
        {item.emoji && (
          <motion.span
            className="text-xl sm:text-2xl"
            role="img"
            aria-label={item.label}
            animate={{ scale: isSelected ? 1.2 : 1 }}
            transition={{ duration: 0.2 }}
          >
            {item.emoji}
          </motion.span>
        )}
        <motion.span
          className={`
            text-[10px] sm:text-xs font-medium text-center px-1 leading-tight
            ${isSelected ? 'text-gray-900 font-bold' : 'text-[#73FFA2]'}
          `}
          animate={{ scale: isSelected ? 1.1 : 1 }}
          transition={{ duration: 0.2 }}
        >
          {item.label}
        </motion.span>
      </div>
    </motion.button>
  )
}

/**
 * Grid principal de panal
 */
export function HoneycombGrid({
  items,
  selectedSlugs,
  onToggle,
  minSelection = 0,
  maxSelection,
  allowMultiple = true,
}: HoneycombGridProps) {
  const canSelectMore = maxSelection ? selectedSlugs.length < maxSelection : true
  const canDeselect = minSelection ? selectedSlugs.length > minSelection : true

  // Organizar items en filas tipo panal
  const rows = organizeInHoneycombRows(items)

  // 5 hexágonos * ancho (referencia visual)
  const PANAL_COLUMNS = 5

  return (
    <div className="flex flex-col items-center p-2 sm:p-4 overflow-x-auto">
      {rows.map((row, rowIndex) => {
        const isOddRow = rowIndex % 2 === 1
        const isIncomplete = row.length < 4

        const shouldOffset = isOddRow && !isIncomplete

        const offsetX = shouldOffset
          ? 'translate-x-[-36px] sm:translate-x-[44px]'
          : ''

        const justifyClass = isIncomplete
          ? 'justify-start'
          : 'justify-center'

        return (
          <motion.div
            key={rowIndex}
            className={`flex items-center ${justifyClass} ${offsetX}`}
            style={{
              marginTop: rowIndex > 0 ? '-26px' : '0',
              paddingLeft: isIncomplete ? '88px' : '0',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: rowIndex * 0.1 }}
          >
            {row.map((item) => {
              const isSelected = selectedSlugs.includes(item.slug)
              const disabled =
                !allowMultiple ||
                (!isSelected && !canSelectMore) ||
                (isSelected && !canDeselect)

              return (
                <div key={item.slug} className="relative">
                  <HoneycombHexagon
                    item={item}
                    isSelected={isSelected}
                    onClick={() => {
                      if (isSelected && canDeselect) onToggle(item.slug)
                      else if (!isSelected && canSelectMore) onToggle(item.slug)
                    }}
                    disabled={disabled}
                  />
                </div>
              )
            })}
          </motion.div>
        )
      })}
    </div>
  )
}
