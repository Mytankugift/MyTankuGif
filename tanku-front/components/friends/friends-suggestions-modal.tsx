'use client'

import { SuggestionCard } from '@/components/friends/suggestion-card'
import type { FriendSuggestionDTO } from '@/types/api'

interface FriendsSuggestionsModalProps {
  open: boolean
  onClose: () => void
  suggestions: FriendSuggestionDTO[]
  isLoading: boolean
  emptyMessage?: string
  onSendRequest: (friendId: string) => Promise<void>
}

export function FriendsSuggestionsModal({
  open,
  onClose,
  suggestions,
  isLoading,
  emptyMessage,
  onSendRequest,
}: FriendsSuggestionsModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#191e23] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Explorar sugerencias</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto p-4 custom-scrollbar">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-zinc-500">Cargando…</div>
          ) : suggestions.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              {emptyMessage ?? 'No hay más sugerencias'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((s) => (
                <SuggestionCard key={s.userId} suggestion={s} onSendRequest={onSendRequest} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
