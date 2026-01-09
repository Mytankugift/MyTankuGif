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
}

export function FriendSuggestions({
  suggestions,
  isLoading,
  onSendRequest,
}: FriendSuggestionsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Cargando sugerencias...</div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No hay sugerencias disponibles</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

