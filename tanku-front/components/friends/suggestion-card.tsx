/**
 * Sugerencia — bloquear solo desde perfil; sin menú ⋮
 */

'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFriends } from '@/lib/hooks/use-friends'
import type { FriendSuggestionDTO } from '@/types/api'

interface SuggestionCardProps {
  suggestion: FriendSuggestionDTO
  onSendRequest: (friendId: string) => Promise<void>
  variant?: 'default' | 'strip'
}

export function SuggestionCard({
  suggestion,
  onSendRequest,
  variant = 'default',
}: SuggestionCardProps) {
  const router = useRouter()
  const { sendFriendRequest } = useFriends()
  const [isSending, setIsSending] = useState(false)
  const [hoverNames, setHoverNames] = useState(false)

  const handleSendRequest = async () => {
    setIsSending(true)
    try {
      await sendFriendRequest(suggestion.userId)
      await onSendRequest(suggestion.userId)
    } catch (error) {
      console.error('Error enviando solicitud:', error)
    } finally {
      setIsSending(false)
    }
  }

  const fullName =
    `${suggestion.user.firstName || ''} ${suggestion.user.lastName || ''}`.trim() || 'Sin nombre'
  const initialAvatar = suggestion.user.profile?.avatar || ''
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    fullName || 'U'
  )}&background=1E1E1E&color=73FFA2&size=128&bold=true`
  const [imgSrc, setImgSrc] = useState<string>(initialAvatar || fallbackAvatar)

  const profilePath = suggestion.user.username
    ? `/profile/${suggestion.user.username}`
    : `/profile/${suggestion.userId}`

  const mutual = suggestion.mutualFriendsCount ?? 0
  const showMutual = mutual > 0
  const displayName = suggestion.user.username?.trim() || fullName

  /** Lista vertical en barra lateral: una fila por sugerencia (no carrusel horizontal) */
  if (variant === 'strip') {
    return (
      <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2 sm:gap-3 sm:px-2.5">
        <button
          type="button"
          onClick={() => router.push(profilePath)}
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/15 bg-zinc-800/80 ring-1 ring-black/15 transition-[transform,opacity] hover:opacity-95"
          aria-label={`Perfil ${displayName}`}
        >
          <Image
            src={imgSrc}
            alt=""
            width={44}
            height={44}
            className="h-full w-full object-cover"
            onError={() => {
              if (imgSrc !== fallbackAvatar) setImgSrc(fallbackAvatar)
            }}
            referrerPolicy="no-referrer"
            unoptimized
          />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden py-0.5">
          <p className="truncate text-[13px] font-medium leading-tight text-zinc-100" title={displayName}>
            {displayName}
          </p>
          {showMutual && (
            <p className="truncate text-[11px] text-zinc-500">
              {mutual === 1 ? '1 amigo en común' : `${mutual} amigos en común`}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSendRequest}
          disabled={isSending}
          aria-label={isSending ? 'Enviando…' : 'Agregar a tu red'}
          className="shrink-0 rounded-full bg-[#73FFA2] px-3 py-1.5 text-[11px] font-semibold text-zinc-900 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? '…' : 'Agregar'}
        </button>
      </div>
    )
  }

  const textUser = 'text-sm'

  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] shadow-sm transition-colors hover:border-white/[0.14]">
      <div className="relative aspect-[5/6] w-full bg-zinc-800/80">
        <button
          type="button"
          onClick={() => router.push(profilePath)}
          className="absolute inset-0 block h-full w-full"
          aria-label="Ver perfil"
        >
          <Image
            src={imgSrc}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 200px"
            onError={() => {
              if (imgSrc !== fallbackAvatar) setImgSrc(fallbackAvatar)
            }}
            referrerPolicy="no-referrer"
            unoptimized
          />
        </button>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        <button
          type="button"
          onClick={() => router.push(profilePath)}
          className={`w-full text-left font-medium text-zinc-100 ${textUser}`}
        >
          {suggestion.user.username ? (
            <span className="line-clamp-1">{suggestion.user.username}</span>
          ) : (
            <span className="line-clamp-2">{fullName}</span>
          )}
        </button>
        {suggestion.user.username && fullName !== 'Sin nombre' && (
          <p className="line-clamp-1 text-xs text-zinc-500">{fullName}</p>
        )}

        {showMutual && (
          <div
            className="relative"
            onMouseEnter={() => setHoverNames(true)}
            onMouseLeave={() => setHoverNames(false)}
          >
            <p className="text-[11px] text-zinc-500">
              {mutual === 1 ? '1 en común' : `${mutual} en común`}
            </p>
            {hoverNames && suggestion.mutualFriendNames && suggestion.mutualFriendNames.length > 0 && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-28 min-w-[160px] overflow-auto rounded-md border border-white/10 bg-[#1a1f24] p-2 text-[10px] text-zinc-300 shadow-lg">
                <ul className="list-disc space-y-0.5 pl-3">
                  {suggestion.mutualFriendNames.map((name, idx) => (
                    <li key={idx}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleSendRequest}
          disabled={isSending}
          aria-label={isSending ? 'Enviando…' : 'Agregar a tu red'}
          className="mt-auto w-full rounded-lg bg-[#73FFA2] py-1.5 text-xs font-semibold text-zinc-900 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? '…' : 'Agregar'}
        </button>
      </div>
    </div>
  )
}
