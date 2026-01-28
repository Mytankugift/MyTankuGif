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

// Función para ocultar los marcadores @{userId} y mostrar el nombre
// Nota: Esta función se usa solo cuando se recibe un valor externo que ya tiene marcadores
// En el flujo normal, el displayValue ya tiene los nombres visibles
const hideMentionIds = (text: string, mentionMap?: Map<string, string>): string => {
  if (!text) return text
  if (!mentionMap) return text
  
  // Reemplazar @{userId} con @NombreCompleto usando el mapa
  return text.replace(/@\{([a-zA-Z0-9_-]+)\}/g, (match, userId) => {
    const displayName = mentionMap.get(userId) || `@usuario`
    return displayName
  })
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
  const mentionMapRef = useRef<Map<string, string>>(new Map()) // Mapa userId -> @NombreCompleto
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  // Sincronizar displayValue cuando cambia el value externo
  // IMPORTANTE: Siempre ocultar IDs en displayValue, incluso si value viene con IDs
  useEffect(() => {
    if (value === undefined || value === null) {
      setDisplayValue('')
      setInternalValue('')
      return
    }
    
    // Si el valor externo tiene marcadores @{userId}, ocultarlos para mostrar
    const hidden = hideMentionIds(value, mentionMapRef.current)
    
    // Si el valor tiene marcadores, extraerlos y actualizar el mapa
    const mentionMatches = value.matchAll(/@\{([a-zA-Z0-9_-]+)\}/g)
    for (const match of mentionMatches) {
      const userId = match[1]
      // Si no está en el mapa, usar un placeholder (se actualizará cuando se inserte la mención)
      if (!mentionMapRef.current.has(userId)) {
        mentionMapRef.current.set(userId, '@usuario')
      }
    }
    
    // SIEMPRE actualizar displayValue para asegurar que los IDs estén ocultos
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
          const textAfterThisAt = textBeforeCursor.substring(i + 1)
          
          // Verificar si este @ es parte de una mención completada (tiene {userId})
          // Formato: @{userId} - mención completada
          const completedMentionMatch = textAfterThisAt.match(/^\{[a-zA-Z0-9_-]+\}/)
          if (completedMentionMatch) {
            // Esta es una mención completada, seguir buscando hacia atrás
            continue
          }
          
          // Si hay un espacio o salto de línea inmediatamente después, no es válido
          if (textAfterThisAt.match(/^[\s\n]/)) {
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
    
    // Usar internalValue para obtener el texto real antes del cursor
    const textBefore = internalValue.substring(0, mentionStart)
    // Calcular textAfter desde la posición del cursor en displayValue
    // Necesitamos mapear la posición del cursor de displayValue a internalValue
    const displayTextBefore = displayValue.substring(0, mentionStart)
    const displayTextAfter = displayValue.substring(cursorPos)
    
    // Obtener el nombre a mostrar (prioridad: firstName+lastName > username)
    const displayName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`
      : (user.username || user.email.split('@')[0])
    
    // Guardar en el mapa para poder mostrar el nombre después
    mentionMapRef.current.set(user.id, `@${displayName}`)
    
    // Formato interno: @{userId} (esto es lo que se envía al backend)
    const mentionMarker = `@{${user.id}}`
    
    // Valor interno: con el marcador @{userId}
    const newInternalValue = `${textBefore}${mentionMarker} ${displayTextAfter}`
    
    // Valor mostrado: con el nombre visible
    const newDisplayValue = `${displayTextBefore}@${displayName} ${displayTextAfter}`
    
    // Actualizar ambos valores
    setDisplayValue(newDisplayValue)
    setInternalValue(newInternalValue)
    
    // Enviar el valor con marcador al padre (backend recibirá @{userId})
    onChange(newInternalValue)

    setShowSuggestions(false)
    setMentionQuery('')
    setMentionStart(-1)
    setSelectedIndex(-1)

    // Mover cursor después de la mención (basado en displayValue)
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = displayTextBefore.length + displayName.length + 2 // @ + displayName + espacio
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
    
    // Convertir displayValue (con nombres) a internalValue (con @{userId})
    // Estrategia simple: reemplazar cada nombre conocido con su marcador
    let newInternalValue = newDisplayValue
    
    // Reemplazar cada nombre de mención conocida con su marcador
    mentionMapRef.current.forEach((displayName, userId) => {
      const nameWithoutAt = displayName.substring(1) // Quitar el @ inicial
      // Escapar caracteres especiales para el regex
      const escapedName = nameWithoutAt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Buscar @nombre que no esté seguido de { (para evitar reemplazar marcadores ya existentes)
      const nameRegex = new RegExp(`@${escapedName}(?!\\{)`, 'g')
      
      // Verificar si estamos editando esta mención específica (cursor cerca del nombre)
      const textBeforeCursor = newDisplayValue.substring(0, cursorPos)
      const mentionPos = textBeforeCursor.lastIndexOf(displayName)
      const isEditingThisMention = mentionPos !== -1 && 
        (cursorPos - mentionPos) < displayName.length + 10 // Cursor dentro o cerca de la mención
      
      // Solo reemplazar si no estamos editando esta mención
      if (!isEditingThisMention && nameRegex.test(newDisplayValue)) {
        newInternalValue = newInternalValue.replace(nameRegex, `@{${userId}}`)
      }
    })
    
    // Actualizar internalValue
    setInternalValue(newInternalValue)
    
    // Enviar el valor con marcadores al padre
    onChange(newInternalValue)
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

  // Función para obtener el nombre completo a mostrar (prioridad: firstName+lastName > username)
  const getUserDisplayName = (user: User) => {
    // Prioridad: firstName + lastName > username
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    if (user.username) {
      return user.username
    }
    // Fallback: primera parte del email (solo si no hay nombre ni username)
    return user.email.split('@')[0]
  }

  // Función para obtener el username a mostrar (para mostrar debajo del nombre)
  const getUserUsername = (user: User) => {
    return user.username || null
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
            const username = getUserUsername(user)
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
                  {username ? (
                    <p className="text-gray-400 text-xs">@{username}</p>
                  ) : (
                    <p className="text-gray-500 text-xs">Sin username</p>
                  )}
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

