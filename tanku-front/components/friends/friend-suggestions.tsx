/**
 * Lista de sugerencias de amigos
 */

'use client'

import { SuggestionCard } from './suggestion-card'
import type { FriendSuggestionDTO } from '@/types/api'

interface FriendSuggestionsProps {
  suggestions: FriendSuggestionDTO[]
  isLoading: boolean
  onSendRequest: (friendId: string) => Promise<void>
  /** Mensaje cuando la lista está vacía (p. ej. búsqueda sin resultados) */
  emptyMessage?: string
}

export function FriendSuggestions({
  suggestions,
  isLoading,
  onSendRequest,
  emptyMessage,
}: FriendSuggestionsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Cargando...</div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">{emptyMessage ?? 'No hay sugerencias disponibles'}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-5xl mx-auto">
      {suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.userId}
          suggestion={suggestion}
          onSendRequest={onSendRequest}
        />
      ))}
    </div>
  )
}

