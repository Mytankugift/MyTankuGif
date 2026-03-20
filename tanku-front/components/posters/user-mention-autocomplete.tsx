'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import Image from 'next/image'

/** Por encima de PosterDetailModal / ProductModal (10050), por debajo del nav móvil global */
const MENTION_SUGGESTIONS_Z = 100_600

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

// Componente para cada item de sugerencia con manejo de avatar mejorado
function UserSuggestionItem({ 
  user, 
  displayName, 
  username, 
  isSelected, 
  onSelect 
}: { 
  user: User
  displayName: string
  username: string | null
  isSelected: boolean
  onSelect: () => void
}) {
  const [avatarError, setAvatarError] = useState(false)
  const [showFallback, setShowFallback] = useState(!user.avatar)

  useEffect(() => {
    setShowFallback(!user.avatar || avatarError)
  }, [user.avatar, avatarError])

  const handleImageError = () => {
    setAvatarError(true)
    setShowFallback(true)
  }

  const initial = (user.firstName?.[0] || user.email[0] || 'U').toUpperCase()

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-700 transition-colors ${
        isSelected ? 'bg-gray-700' : ''
      }`}
    >
      {/* Avatar container con tamaño fijo */}
      <div className="w-8 h-8 flex-shrink-0 relative">
        {user.avatar && !avatarError ? (
          <Image
            src={user.avatar}
            alt={displayName}
            fill
            className="rounded-full object-cover"
            unoptimized={user.avatar.startsWith('http')}
            onError={handleImageError}
          />
        ) : null}
        {/* Fallback - solo visible si no hay avatar o si la imagen falló */}
        {showFallback && (
          <div className="absolute inset-0 rounded-full bg-gray-700 flex items-center justify-center">
            <span className="text-gray-400 text-xs font-bold">
              {initial}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-white text-sm font-medium truncate">{displayName}</p>
        {username ? (
          <p className="text-gray-400 text-xs truncate">@{username}</p>
        ) : (
          <p className="text-gray-500 text-xs">Sin username</p>
        )}
      </div>
    </button>
  )
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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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
        
        // Detener búsquedas anteriores
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
          searchTimeoutRef.current = null
        }
        
        // Si hay espacio o salto de línea después del @, no es una mención válida
        if (textAfterAt.match(/^[\s\n]/)) {
          setShowSuggestions(false)
          setMentionQuery('')
          setMentionStart(-1)
          return
        }

        // Verificar que no hay espacios en el medio (solo username sin espacios)
        // Si hay espacio, la mención ya terminó, no buscar más
        const spaceIndex = textAfterAt.indexOf(' ')
        if (spaceIndex > 0) {
          // Hay un espacio, la mención ya terminó, no buscar más
          setShowSuggestions(false)
          setMentionQuery('')
          setMentionStart(-1)
          return
        }

        setMentionStart(lastAtIndex)
        setMentionQuery(textAfterAt)

        // Debounce: esperar 300ms antes de buscar para evitar demasiadas peticiones
        searchTimeoutRef.current = setTimeout(() => {
          if (textAfterAt.length >= 1) {
            searchUsers(textAfterAt)
          } else {
            // Mostrar sugerencias recientes o populares cuando solo se escribe @
            searchUsers('')
          }
        }, 300)
        
        // Actualizar posición del popup (arriba del input)
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect()
          // Portal + position:fixed → solo coordenadas de viewport (sin scrollY/scrollX)
          setSuggestionsPosition({
            top: rect.top - 4,
            left: rect.left,
            width: rect.width,
          })
        }
      } else {
        // Limpiar timeout si no hay @ activo
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
          searchTimeoutRef.current = null
        }
        setShowSuggestions(false)
        setMentionQuery('')
        setMentionStart(-1)
      }
    }

    handleInput(displayValue)
    
    // Cleanup del timeout al desmontar o cambiar displayValue
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = null
      }
    }
  }, [displayValue])

  // Mantener el popup alineado al input si el usuario hace scroll dentro del modal
  useEffect(() => {
    if (!showSuggestions) return

    const updatePos = () => {
      if (!inputRef.current) return
      const rect = inputRef.current.getBoundingClientRect()
      setSuggestionsPosition({
        top: rect.top - 4,
        left: rect.left,
        width: rect.width,
      })
    }

    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [showSuggestions])

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

    // Obtener la posición actual del cursor
    const cursorPos = inputRef.current.selectionStart || displayValue.length
    
    // Calcular todo desde displayValue para mantener consistencia
    const displayTextBefore = displayValue.substring(0, mentionStart)
    const displayTextAfter = displayValue.substring(cursorPos)
    
    // Obtener el nombre a mostrar (prioridad: username > firstName+lastName)
    const displayName = user.username || 
      (user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.email.split('@')[0])
    
    // Guardar en el mapa para poder mostrar el nombre después
    mentionMapRef.current.set(user.id, `@${displayName}`)
    
    // Construir el nuevo displayValue con la mención insertada
    const newDisplayValue = `${displayTextBefore}@${displayName} ${displayTextAfter}`
    
    // Reconstruir internalValue desde newDisplayValue usando el mapa de menciones
    // Esto asegura que todas las menciones (incluyendo la nueva) se conviertan correctamente
    let newInternalValue = newDisplayValue
    
    // Reemplazar todas las menciones conocidas (incluyendo la nueva) con sus marcadores
    mentionMapRef.current.forEach((displayName, userId) => {
      const nameWithoutAt = displayName.substring(1)
      const escapedName = nameWithoutAt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Buscar @nombre que no esté seguido de { (para evitar reemplazar marcadores ya existentes)
      const nameRegex = new RegExp(`@${escapedName}(?!\\{)`, 'g')
      newInternalValue = newInternalValue.replace(nameRegex, `@{${userId}}`)
    })
    
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
    
    // Buscar menciones por username (sin espacios) primero - Prioridad alta
    const usernameMentionRegex = /@([a-zA-Z0-9_-]+)(?=\s|$|@|,|\.|!|\?)/g
    const usernameMatches = Array.from(newDisplayValue.matchAll(usernameMentionRegex))
    
    // Buscar menciones por nombre completo (con espacios) solo si no hay username match
    const nameMentionRegex = /@([a-zA-ZáéíóúÁÉÍÓÚñÑ][a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{0,20}[a-zA-ZáéíóúÁÉÍÓÚñÑ])(?=\s|$|@|,|\.|!|\?)/g
    const nameMatches = usernameMatches.length === 0 
      ? Array.from(newDisplayValue.matchAll(nameMentionRegex))
      : []
    
    // Combinar matches, priorizando usernames
    const matches = [...usernameMatches, ...nameMatches]
    
    // Para cada mención por nombre encontrada, buscar el usuario si no está en el mapa
    matches.forEach(async (match) => {
      const name = match[1].trim()
      // Verificar si ya está en el mapa
      const existingEntry = Array.from(mentionMapRef.current.entries())
        .find(([userId, displayName]) => {
          const nameWithoutAt = displayName.substring(1)
          return nameWithoutAt.toLowerCase() === name.toLowerCase() ||
                 nameWithoutAt.toLowerCase().includes(name.toLowerCase()) ||
                 name.toLowerCase().includes(nameWithoutAt.toLowerCase())
        })
      
      if (!existingEntry && name.length > 0) {
        // Buscar usuario por nombre (solo una vez, no hacer múltiples requests)
        // Usar un debounce simple: solo buscar si el nombre tiene al menos 2 caracteres
        if (name.length >= 2) {
          try {
            const response = await apiClient.get<User[]>(
              `${API_ENDPOINTS.USERS.SEARCH}?q=${encodeURIComponent(name)}&limit=5`
            )
            
            if (response.success && response.data && response.data.length > 0) {
              // Buscar el usuario que mejor coincida
              // Priorizar búsqueda por username (sin espacios, más fácil de trabajar)
              const nameLower = name.toLowerCase().trim()
              const bestMatch = response.data.find(user => {
                // Primero buscar por username exacto o parcial
                if (user.username) {
                  const usernameLower = user.username.toLowerCase()
                  if (usernameLower === nameLower || usernameLower.includes(nameLower)) {
                    return true
                  }
                }
                // Fallback: buscar por nombre completo
                if (user.firstName && user.lastName) {
                  const userFullName = `${user.firstName} ${user.lastName}`.toLowerCase()
                  return userFullName.includes(nameLower)
                }
                return false
              }) || response.data[0]
              
              if (bestMatch) {
                // Usar username primero (sin espacios, más fácil de trabajar)
                const displayName = bestMatch.username || 
                  (bestMatch.firstName && bestMatch.lastName 
                    ? `${bestMatch.firstName} ${bestMatch.lastName}`
                    : bestMatch.email.split('@')[0])
                
                // Agregar al mapa
                mentionMapRef.current.set(bestMatch.id, `@${displayName}`)
                
                // Actualizar el internalValue con el nuevo mapeo
                const updatedInternalValue = newDisplayValue.replace(
                  new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@|,|\\.|!|\\?)`, 'g'),
                  `@{${bestMatch.id}}`
                )
                setInternalValue(updatedInternalValue)
                onChange(updatedInternalValue)
              }
            }
          } catch (err) {
            // Silenciar errores de búsqueda
          }
        }
      }
    })
    
    // Convertir displayValue (con nombres) a internalValue (con @{userId})
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
          className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar"
          style={{
            zIndex: MENTION_SUGGESTIONS_Z,
            top: `${suggestionsPosition.top}px`,
            left: `${suggestionsPosition.left}px`,
            width: `${suggestionsPosition.width || 300}px`,
            transform: 'translateY(-100%)',
            marginTop: '-4px',
          }}
        >
          {suggestions.map((user, index) => {
            const displayName = getUserDisplayName(user)
            const username = getUserUsername(user)
            return (
              <UserSuggestionItem
                key={user.id}
                user={user}
                displayName={displayName}
                username={username}
                isSelected={index === selectedIndex}
                onSelect={() => insertMention(user)}
              />
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}

