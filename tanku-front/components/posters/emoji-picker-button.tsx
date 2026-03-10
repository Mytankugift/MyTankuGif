'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'

// Importar dinámicamente para evitar problemas de SSR
const EmojiPicker = dynamic(
  () => import('emoji-picker-react').then((mod) => mod.default || mod),
  { ssr: false }
)

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void
}

export function EmojiPickerButton({ onEmojiSelect }: EmojiPickerButtonProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const pickerHeight = 400
        
        // Calcular si hay espacio arriba, si no, mostrar abajo
        const spaceAbove = rect.top
        const spaceBelow = viewportHeight - rect.bottom
        
        let top = 0
        if (spaceAbove >= pickerHeight) {
          // Mostrar arriba
          top = rect.top - pickerHeight - 8
        } else if (spaceBelow >= pickerHeight) {
          // Mostrar abajo
          top = rect.bottom + 8
        } else {
          // Centrar verticalmente
          top = Math.max(8, (viewportHeight - pickerHeight) / 2)
        }
        
        setPosition({
          top,
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 350 - 8)),
        })
      }
    }

    if (showPicker) {
      updatePosition()
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
    }

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [showPicker])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false)
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPicker])

  const handleEmojiClick = (emojiData: any) => {
    onEmojiSelect(emojiData.emoji)
    setShowPicker(false)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#73FFA2] transition-colors p-1"
        title="Agregar emoji"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {showPicker && typeof window !== 'undefined' && createPortal(
        <div
          ref={pickerRef}
          className="fixed z-[10000]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={'dark' as any}
            width={350}
            height={400}
            previewConfig={{
              showPreview: false,
            }}
            searchDisabled={false}
            skinTonesDisabled={false}
          />
        </div>,
        document.body
      )}
    </>
  )
}

