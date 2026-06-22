'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import Image from 'next/image'
import { clsx } from 'clsx'

import { TANKU_MENTION_SUGGESTIONS_Z } from '@/lib/ui/tanku-modal-surface'

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  username: string | null
  avatar: string | null
  isFriend?: boolean
}

interface UserMentionAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (user: User) => void
  placeholder?: string
  disabled?: boolean
}

const hideMentionIds = (text: string, mentionMap?: Map<string, string>): string => {
  if (!text) return text
  if (!mentionMap) return text

  return text.replace(/@\{([a-zA-Z0-9_-]+)\}/g, (match, userId) => {
    const displayName = mentionMap.get(userId) || `@usuario`
    return displayName
  })
}

function UserSuggestionItem({
  user,
  displayName,
  username,
  isSelected,
  onSelect,
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
      onPointerDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 px-4 py-2 transition-colors hover:bg-gray-700 ${
        isSelected ? 'bg-gray-700' : ''
      }`}
    >
      <div className="relative h-8 w-8 flex-shrink-0">
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
        {showFallback && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-gray-700">
            <span className="text-xs font-bold text-gray-400">{initial}</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-white">{displayName}</p>
        {username ? (
          <p className="truncate text-xs text-gray-400">@{username}</p>
        ) : (
          <p className="text-xs text-gray-500">Sin username</p>
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
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStart, setMentionStart] = useState(-1)
  const [suggestionsPosition, setSuggestionsPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 240,
    placement: 'above' as 'above' | 'below',
  })
  const [displayValue, setDisplayValue] = useState('')
  const [internalValue, setInternalValue] = useState('')
  const mentionMapRef = useRef<Map<string, string>>(new Map())
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const selectingSuggestionRef = useRef(false)
  const [portalMounted, setPortalMounted] = useState(false)

  useEffect(() => {
    setPortalMounted(true)
  }, [])

  const updateSuggestionsPosition = useCallback(() => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    const vv = window.visualViewport
    const viewportTop = vv?.offsetTop ?? 0
    const viewportHeight = vv?.height ?? window.innerHeight
    const dropdownMaxHeight = Math.min(240, Math.round(viewportHeight * 0.42))
    const spaceAbove = rect.top - viewportTop
    const spaceBelow = viewportTop + viewportHeight - rect.bottom
    const placement =
      spaceBelow >= dropdownMaxHeight || spaceBelow > spaceAbove ? 'below' : 'above'
    const maxHeight =
      placement === 'below'
        ? Math.max(120, Math.min(dropdownMaxHeight, spaceBelow - 12))
        : Math.max(120, Math.min(dropdownMaxHeight, spaceAbove - 12))

    setSuggestionsPosition({
      top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 280),
      maxHeight,
      placement,
    })
  }, [])

  useEffect(() => {
    if (value === undefined || value === null) {
      setDisplayValue('')
      setInternalValue('')
      return
    }

    const hidden = hideMentionIds(value, mentionMapRef.current)
    const mentionMatches = value.matchAll(/@\{([a-zA-Z0-9_-]+)\}/g)
    for (const match of mentionMatches) {
      const userId = match[1]
      if (!mentionMapRef.current.has(userId)) {
        mentionMapRef.current.set(userId, '@usuario')
      }
    }

    setDisplayValue(hidden)
    setInternalValue(value)
  }, [value])

  const searchUsers = useCallback(
    async (query: string) => {
      setIsSearching(true)
      try {
        const response = await apiClient.get<User[]>(
          `${API_ENDPOINTS.USERS.SEARCH}?q=${encodeURIComponent(query)}&limit=8`,
        )

        if (response.success && Array.isArray(response.data)) {
          setSuggestions(response.data)
          setShowSuggestions(true)
          setSelectedIndex(-1)
          requestAnimationFrame(() => updateSuggestionsPosition())
        } else {
          setSuggestions([])
          setShowSuggestions(true)
        }
      } catch (err) {
        console.error('Error buscando usuarios:', err)
        setSuggestions([])
        setShowSuggestions(true)
      } finally {
        setIsSearching(false)
      }
    },
    [updateSuggestionsPosition],
  )

  useEffect(() => {
    const handleInput = (text: string) => {
      const cursorPos = inputRef.current?.selectionStart || text.length
      const textBeforeCursor = text.substring(0, cursorPos)

      let lastAtIndex = -1
      for (let i = cursorPos - 1; i >= 0; i--) {
        if (textBeforeCursor[i] === '@') {
          const textAfterThisAt = textBeforeCursor.substring(i + 1)
          const completedMentionMatch = textAfterThisAt.match(/^\{[a-zA-Z0-9_-]+\}/)
          if (completedMentionMatch) continue
          if (textAfterThisAt.match(/^[\s\n]/)) continue
          lastAtIndex = i
          break
        }
      }

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)

        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
          searchTimeoutRef.current = null
        }

        if (textAfterAt.match(/^[\s\n]/)) {
          setShowSuggestions(false)
          setMentionQuery('')
          setMentionStart(-1)
          return
        }

        const spaceIndex = textAfterAt.indexOf(' ')
        if (spaceIndex > 0) {
          setShowSuggestions(false)
          setMentionQuery('')
          setMentionStart(-1)
          return
        }

        setMentionStart(lastAtIndex)
        setMentionQuery(textAfterAt)
        setShowSuggestions(true)
        setIsSearching(true)
        updateSuggestionsPosition()

        searchTimeoutRef.current = setTimeout(() => {
          void searchUsers(textAfterAt)
        }, 200)
      } else {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
          searchTimeoutRef.current = null
        }
        setShowSuggestions(false)
        setIsSearching(false)
        setMentionQuery('')
        setMentionStart(-1)
      }
    }

    handleInput(displayValue)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = null
      }
    }
  }, [displayValue, searchUsers, updateSuggestionsPosition])

  useEffect(() => {
    if (!showSuggestions) return

    const updatePos = () => updateSuggestionsPosition()
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    window.visualViewport?.addEventListener('resize', updatePos)
    window.visualViewport?.addEventListener('scroll', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
      window.visualViewport?.removeEventListener('resize', updatePos)
      window.visualViewport?.removeEventListener('scroll', updatePos)
    }
  }, [showSuggestions, updateSuggestionsPosition, suggestions.length])

  const insertMention = (user: User) => {
    if (mentionStart === -1 || !inputRef.current) return

    const cursorPos = inputRef.current.selectionStart || displayValue.length
    const displayTextBefore = displayValue.substring(0, mentionStart)
    const displayTextAfter = displayValue.substring(cursorPos)

    const displayName =
      user.username ||
      (user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.email.split('@')[0])

    mentionMapRef.current.set(user.id, `@${displayName}`)
    const newDisplayValue = `${displayTextBefore}@${displayName} ${displayTextAfter}`

    let newInternalValue = newDisplayValue
    mentionMapRef.current.forEach((mentionDisplayName, userId) => {
      const nameWithoutAt = mentionDisplayName.substring(1)
      const escapedName = nameWithoutAt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const nameRegex = new RegExp(`@${escapedName}(?!\\{)`, 'g')
      newInternalValue = newInternalValue.replace(nameRegex, `@{${userId}}`)
    })

    setDisplayValue(newDisplayValue)
    setInternalValue(newInternalValue)
    onChange(newInternalValue)
    setShowSuggestions(false)
    setIsSearching(false)
    setMentionQuery('')
    setMentionStart(-1)
    setSelectedIndex(-1)

    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = displayTextBefore.length + displayName.length + 2
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
        inputRef.current.focus()
      }
    }, 0)

    onSelect?.(user)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayValue = e.target.value
    const cursorPos = e.target.selectionStart || newDisplayValue.length
    setDisplayValue(newDisplayValue)

    const usernameMentionRegex = /@([a-zA-Z0-9_-]+)(?=\s|$|@|,|\.|!|\?)/g
    const usernameMatches = Array.from(newDisplayValue.matchAll(usernameMentionRegex))
    const nameMentionRegex =
      /@([a-zA-ZáéíóúÁÉÍÓÚñÑ][a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{0,20}[a-zA-ZáéíóúÁÉÍÓÚñÑ])(?=\s|$|@|,|\.|!|\?)/g
    const nameMatches =
      usernameMatches.length === 0 ? Array.from(newDisplayValue.matchAll(nameMentionRegex)) : []
    const matches = [...usernameMatches, ...nameMatches]

    matches.forEach(async (match) => {
      const name = match[1].trim()
      const existingEntry = Array.from(mentionMapRef.current.entries()).find(([, mentionDisplayName]) => {
        const nameWithoutAt = mentionDisplayName.substring(1)
        return (
          nameWithoutAt.toLowerCase() === name.toLowerCase() ||
          nameWithoutAt.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(nameWithoutAt.toLowerCase())
        )
      })

      if (!existingEntry && name.length >= 2) {
        try {
          const response = await apiClient.get<User[]>(
            `${API_ENDPOINTS.USERS.SEARCH}?q=${encodeURIComponent(name)}&limit=5`,
          )
          if (response.success && response.data && response.data.length > 0) {
            const nameLower = name.toLowerCase().trim()
            const bestMatch =
              response.data.find((user) => {
                if (user.username) {
                  const usernameLower = user.username.toLowerCase()
                  if (usernameLower === nameLower || usernameLower.includes(nameLower)) return true
                }
                if (user.firstName && user.lastName) {
                  const userFullName = `${user.firstName} ${user.lastName}`.toLowerCase()
                  return userFullName.includes(nameLower)
                }
                return false
              }) || response.data[0]

            const resolvedName =
              bestMatch.username ||
              (bestMatch.firstName && bestMatch.lastName
                ? `${bestMatch.firstName} ${bestMatch.lastName}`
                : bestMatch.email.split('@')[0])

            mentionMapRef.current.set(bestMatch.id, `@${resolvedName}`)
            const updatedInternalValue = newDisplayValue.replace(
              new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@|,|\\.|!|\\?)`, 'g'),
              `@{${bestMatch.id}}`,
            )
            setInternalValue(updatedInternalValue)
            onChange(updatedInternalValue)
          }
        } catch {
          // silenciar
        }
      }
    })

    let newInternalValue = newDisplayValue
    mentionMapRef.current.forEach((mentionDisplayName, userId) => {
      const nameWithoutAt = mentionDisplayName.substring(1)
      const escapedName = nameWithoutAt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const nameRegex = new RegExp(`@${escapedName}(?!\\{)`, 'g')
      const textBeforeCursor = newDisplayValue.substring(0, cursorPos)
      const mentionPos = textBeforeCursor.lastIndexOf(mentionDisplayName)
      const isEditingThisMention =
        mentionPos !== -1 && cursorPos - mentionPos < mentionDisplayName.length + 10
      if (!isEditingThisMention && nameRegex.test(newDisplayValue)) {
        newInternalValue = newInternalValue.replace(nameRegex, `@{${userId}}`)
      }
    })

    setInternalValue(newInternalValue)
    onChange(newInternalValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      insertMention(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
    if (user.username) return user.username
    return user.email.split('@')[0]
  }

  const getUserUsername = (user: User) => user.username || null

  const renderSuggestionsList = () => {
    if (isSearching && suggestions.length === 0) {
      return (
        <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-gray-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#73FFA2] border-t-transparent" />
          Buscando…
        </div>
      )
    }

    if (suggestions.length === 0) {
      return (
        <p className="px-4 py-3 text-center text-sm text-gray-500">
          {mentionQuery ? 'Sin resultados' : 'No hay amigos para mencionar'}
        </p>
      )
    }

    return suggestions.map((user, index) => {
      const displayName = getUserDisplayName(user)
      const username = getUserUsername(user)
      const showOthersHeader =
        index > 0 && suggestions[index - 1]?.isFriend === true && user.isFriend === false
      return (
        <React.Fragment key={user.id}>
          {index === 0 && user.isFriend ? (
            <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Amigos
            </p>
          ) : null}
          {showOthersHeader ? (
            <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Otros
            </p>
          ) : null}
          <UserSuggestionItem
            user={user}
            displayName={displayName}
            username={username}
            isSelected={index === selectedIndex}
            onSelect={() => insertMention(user)}
          />
        </React.Fragment>
      )
    })
  }

  const suggestionsPanelClass =
    'rounded-lg border border-gray-700 bg-gray-800 shadow-lg custom-scrollbar overflow-y-auto overscroll-contain'

  const suggestionsPanel = showSuggestions ? (
    <div
      ref={suggestionsRef}
      className={clsx(suggestionsPanelClass, 'fixed')}
      style={{
        zIndex: TANKU_MENTION_SUGGESTIONS_Z,
        top: `${suggestionsPosition.top}px`,
        left: `${suggestionsPosition.left}px`,
        width: `${suggestionsPosition.width}px`,
        maxHeight: `${suggestionsPosition.maxHeight}px`,
        transform:
          suggestionsPosition.placement === 'above' ? 'translateY(-100%)' : undefined,
      }}
      onPointerDown={(e) => {
        e.preventDefault()
        selectingSuggestionRef.current = true
      }}
      onPointerUp={() => {
        selectingSuggestionRef.current = false
      }}
    >
      {renderSuggestionsList()}
    </div>
  ) : null

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (mentionStart !== -1) {
            setShowSuggestions(true)
            updateSuggestionsPosition()
          }
        }}
        onBlur={() => {
          setTimeout(() => {
            if (!selectingSuggestionRef.current) {
              setShowSuggestions(false)
            }
          }, 200)
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="tanku-input-text-ios w-full rounded-2xl border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#73FFA2]"
      />

      {portalMounted && showSuggestions
        ? createPortal(suggestionsPanel, document.body)
        : null}
    </div>
  )
}
