'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import Image from 'next/image'

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  username: string | null
  avatar: string | null
}

interface UserMentionAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (user: User) => void
  placeholder?: string
  disabled?: boolean
}

// Función para ocultar el ID de las menciones en el texto mostrado
const hideMentionIds = (text: string): string => {
  if (!text) return text
  // Reemplazar @displayName|userId con solo @displayName
  // El regex busca: @ seguido de cualquier cosa que no sea | o @, luego |, luego el ID (mínimo 20 caracteres)
  // Usamos [^|@]+ para capturar nombres con espacios
  return text.replace(/@([^|@]+)\|([a-zA-Z0-9_-]{20,})/g, '@$1')
}

// Función para restaurar el formato completo con IDs
const restoreMentionIds = (text: string, originalText: string): string => {
  // Si el texto cambió pero tiene menciones sin ID, restaurar desde el original
  // Regex mejorado para capturar nombres con espacios: @displayName|userId
  const mentions = originalText.match(/@([^|@]+?)\|([a-zA-Z0-9_-]{20,})/g) || []
  let restored = text
  
  mentions.forEach(mention => {
    const match = mention.match(/@([^|@]+?)\|([a-zA-Z0-9_-]{20,})/)
    if (match) {
      const [, displayName, userId] = match
      // Escapar caracteres especiales del displayName para el regex
      const escapedDisplayName = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Buscar @displayName sin | y sin que esté seguido de más caracteres que formen parte del ID
      // Reemplazar solo si no tiene ya el formato completo
      const regex = new RegExp(`@${escapedDisplayName}(?!\\|)`, 'g')
      restored = restored.replace(regex, `@${displayName}|${userId}`)
    }
  })
  
  return restored
}

export function UserMentionAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Escribe un comentario...',
  disabled = false,
}: UserMentionAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStart, setMentionStart] = useState(-1)
  const [suggestionsPosition, setSuggestionsPosition] = useState({ top: 0, left: 0, width: 0 })
  const [displayValue, setDisplayValue] = useState('') // Valor mostrado (sin IDs)
  const [internalValue, setInternalValue] = useState('') // Valor real (con IDs)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  // Sincronizar displayValue cuando cambia el value externo
  // IMPORTANTE: Siempre ocultar IDs en displayValue, incluso si value viene con IDs
  useEffect(() => {
    if (value === undefined || value === null) return
    
    // Si el valor externo tiene IDs, ocultarlos para mostrar
    const hidden = hideMentionIds(value)
    
    // SIEMPRE actualizar displayValue para asegurar que los IDs estén ocultos
    // Esto es crítico: si value viene con IDs, deben ocultarse
    setDisplayValue(hidden)
    
    // Actualizar internalValue con el valor completo (con IDs)
    setInternalValue(value)
  }, [value])

  // Buscar usuarios cuando se escribe @ (usar displayValue para detectar menciones)
  useEffect(() => {
    const handleInput = (text: string) => {
      const cursorPos = inputRef.current?.selectionStart || text.length
      const textBeforeCursor = text.substring(0, cursorPos)
      
      // Buscar el @ más cercano al cursor que no sea parte de una mención ya completada
      // Buscar desde el cursor hacia atrás para encontrar el @ activo
      let lastAtIndex = -1
      for (let i = cursorPos - 1; i >= 0; i--) {
        if (textBeforeCursor[i] === '@') {
          // Verificar si este @ es parte de una mención completada (tiene | seguido de ID)
          const textAfterThisAt = textBeforeCursor.substring(i + 1)
          
          // Si hay un | seguido de un ID (mínimo 20 caracteres), es una mención completada
          const completedMentionMatch = textAfterThisAt.match(/^[^|@]*\|[a-zA-Z0-9_-]{20,}/)
          if (completedMentionMatch) {
            // Esta es una mención completada, seguir buscando hacia atrás
            continue
          }
          
          // Si hay un espacio, salto de línea o | sin ID después, no es válido
          if (textAfterThisAt.match(/^[\s\n]/) || textAfterThisAt.match(/^\|/)) {
            // No es válido, seguir buscando
            continue
          }
          
          // Este es el @ activo (más cercano al cursor que no está completado)
          lastAtIndex = i
          break
        }
      }

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
        
        // Si hay espacio o salto de línea después del @, no es una mención válida
        if (textAfterAt.match(/^[\s\n]/)) {
          setShowSuggestions(false)
          setMentionQuery('')
          setMentionStart(-1)
          return
        }

        setMentionStart(lastAtIndex)
        setMentionQuery(textAfterAt)

        // Si hay texto después del @, buscar usuarios
        if (textAfterAt.length >= 1) {
          searchUsers(textAfterAt)
        } else {
          // Mostrar sugerencias recientes o populares cuando solo se escribe @
          searchUsers('')
        }
        
        // Actualizar posición del popup (arriba del input)
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect()
          setSuggestionsPosition({
            top: rect.top + window.scrollY - 4, // Arriba del input
            left: rect.left + window.scrollX,
            width: rect.width,
          })
        }
      } else {
        setShowSuggestions(false)
        setMentionQuery('')
        setMentionStart(-1)
      }
    }

    handleInput(displayValue)
  }, [displayValue])

  const searchUsers = async (query: string) => {
    // Si no hay query, buscar usuarios recientes o populares (primeros 5)
    // Si hay query, buscar por nombre/email
    const searchQuery = query.length >= 1 ? query : ''

    try {
      const response = await apiClient.get<User[]>(
        `${API_ENDPOINTS.USERS.SEARCH}?q=${encodeURIComponent(query)}&limit=5`
      )

      if (response.success && response.data) {
        setSuggestions(response.data)
        setShowSuggestions(response.data.length > 0)
        setSelectedIndex(-1)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (err) {
      console.error('Error buscando usuarios:', err)
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const insertMention = (user: User) => {
    if (mentionStart === -1 || !inputRef.current) return

    // Obtener la posición actual del cursor para calcular correctamente textAfter
    const cursorPos = inputRef.current.selectionStart || displayValue.length
    
    // Usar displayValue para la posición (sin IDs)
    const textBefore = displayValue.substring(0, mentionStart)
    // Calcular textAfter desde la posición del cursor, no desde mentionQuery
    // Esto asegura que funcione correctamente con múltiples menciones
    const textAfter = displayValue.substring(cursorPos)
    
    // Obtener el nombre a mostrar (username > firstName+lastName > email)
    const displayName = user.username 
      || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email.split('@')[0])
    
    // Valor mostrado: solo el nombre (sin ID) - esto es lo que verá el usuario
    const newDisplayValue = `${textBefore}@${displayName} ${textAfter}`
    
    // Valor real: con el ID para el backend - esto es lo que se envía
    const newInternalValue = `${textBefore}@${displayName}|${user.id} ${textAfter}`
    
    // Actualizar displayValue inmediatamente (sin ID)
    setDisplayValue(newDisplayValue)
    // Actualizar internalValue (con ID)
    setInternalValue(newInternalValue)
    
    // Enviar el valor con ID al padre
    // NOTA: El useEffect se ejecutará después y ocultará los IDs en displayValue
    onChange(newInternalValue)

    setShowSuggestions(false)
    setMentionQuery('')
    setMentionStart(-1)
    setSelectedIndex(-1)

    // Mover cursor después de la mención (basado en displayValue)
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = mentionStart + displayName.length + 2 // @ + displayName + espacio
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
        inputRef.current.focus()
      }
    }, 0)

    if (onSelect) {
      onSelect(user)
    }
  }
  
  // Manejar cambios en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayValue = e.target.value
    const cursorPos = e.target.selectionStart || newDisplayValue.length
    
    // Actualizar displayValue inmediatamente (lo que ve el usuario)
    setDisplayValue(newDisplayValue)
    
    // Restaurar IDs de menciones existentes basándose en el internalValue anterior
    // Esto asegura que las menciones existentes mantengan sus IDs
    let restoredValue = newDisplayValue
    
    // Buscar todas las menciones con ID en el internalValue anterior
    // Regex mejorado para capturar nombres con espacios
    const existingMentions = internalValue.match(/@([^|@]+?)\|([a-zA-Z0-9_-]{20,})/g) || []
    
    // Obtener el texto antes del cursor para detectar si estamos editando una mención
    const textBeforeCursor = newDisplayValue.substring(0, cursorPos)
    
    // Verificar si hay un @ activo cerca del cursor (dentro de los últimos 50 caracteres)
    const recentText = textBeforeCursor.substring(Math.max(0, textBeforeCursor.length - 50))
    const activeAtIndex = recentText.lastIndexOf('@')
    const isEditingMention = activeAtIndex !== -1 && 
      !recentText.substring(activeAtIndex).match(/@[^|@]*\|[a-zA-Z0-9_-]{20,}/)
    
    existingMentions.forEach(mention => {
      const match = mention.match(/@([^|@]+?)\|([a-zA-Z0-9_-]{20,})/)
      if (match) {
        const [, displayName, userId] = match
        // Escapar caracteres especiales del displayName
        const escapedDisplayName = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        
        // Buscar @displayName sin | en el nuevo texto y reemplazarlo con @displayName|userId
        // Solo si no tiene ya el ID y no está siendo editada actualmente
        const regex = new RegExp(`@${escapedDisplayName}(?!\\|)`, 'g')
        
        // Si estamos editando una mención, verificar que no sea esta la que estamos editando
        if (isEditingMention) {
          const mentionStartInRecent = recentText.lastIndexOf(`@${displayName}`)
          if (mentionStartInRecent !== -1 && mentionStartInRecent === activeAtIndex) {
            // Esta es la mención que se está editando, no restaurar
            return
          }
        }
        
        restoredValue = restoredValue.replace(regex, `@${displayName}|${userId}`)
      }
    })
    
    // Actualizar internalValue
    setInternalValue(restoredValue)
    
    // Enviar el valor con IDs al padre (pero el input mostrará solo displayValue)
    onChange(restoredValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      insertMention(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const getUserDisplayName = (user: User) => {
    // Prioridad: username > firstName + lastName > email
    if (user.username) {
      return user.username
    }
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.email.split('@')[0]
  }

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (mentionQuery && suggestions.length > 0) {
            setShowSuggestions(true)
          }
        }}
        onBlur={() => {
          // Delay para permitir click en sugerencias
          setTimeout(() => setShowSuggestions(false), 200)
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#73FFA2] focus:border-transparent"
      />

      {/* Sugerencias - Portal para evitar restricciones del modal (arriba del input) */}
      {showSuggestions && suggestions.length > 0 && typeof window !== 'undefined' && createPortal(
        <div
          ref={suggestionsRef}
          className="fixed z-[9999] bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          style={{
            top: `${suggestionsPosition.top}px`,
            left: `${suggestionsPosition.left}px`,
            width: `${suggestionsPosition.width || 300}px`,
            transform: 'translateY(-100%)', // Posicionar arriba del input
            marginTop: '-4px', // Pequeño espacio
          }}
        >
          {suggestions.map((user, index) => {
            const displayName = getUserDisplayName(user)
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => insertMention(user)}
                className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-700 transition-colors ${
                  index === selectedIndex ? 'bg-gray-700' : ''
                }`}
              >
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="rounded-full object-cover flex-shrink-0"
                    unoptimized={user.avatar.startsWith('http')}
                    onError={(e) => {
                      // Fallback si la imagen falla
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        const fallback = document.createElement('div')
                        fallback.className = 'w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0'
                        fallback.innerHTML = `<span class="text-gray-400 text-xs font-bold">${(user.firstName?.[0] || user.email[0] || 'U').toUpperCase()}</span>`
                        parent.appendChild(fallback)
                      }
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400 text-xs font-bold">
                      {(user.firstName?.[0] || user.email[0] || 'U').toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="text-white text-sm font-medium">{displayName}</p>
                  <p className="text-gray-400 text-xs">{user.email}</p>
                </div>
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}

