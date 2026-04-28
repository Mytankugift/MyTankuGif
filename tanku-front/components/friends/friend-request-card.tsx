/**
 * Solicitud entrante — vista lateral alineada a sugerencias (strip / fila)
 */

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useFriends } from '@/lib/hooks/use-friends'
import type { FriendRequestDTO } from '@/types/api'

interface FriendRequestCardProps {
  request: FriendRequestDTO
  onAccept: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  compact?: boolean
}

function profilePath(from: FriendRequestDTO['fromUser']) {
  return from.username ? `/profile/${from.username}` : `/profile/${from.id}`
}

export function FriendRequestCard({
  request,
  onAccept,
  onReject,
  compact = false,
}: FriendRequestCardProps) {
  const { acceptRequest, rejectRequest } = useFriends()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAccept = async () => {
    setIsProcessing(true)
    try {
      await acceptRequest(request.id)
      await onAccept(request.id)
    } catch (error) {
      console.error('Error aceptando solicitud:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    setIsProcessing(true)
    try {
      await rejectRequest(request.id)
      await onReject(request.id)
    } catch (error) {
      console.error('Error rechazando solicitud:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const fullName =
    `${request.fromUser.firstName || ''} ${request.fromUser.lastName || ''}`.trim() || 'Sin nombre'
  const displayLabel =
    request.fromUser.username?.trim() ||
    fullName ||
    request.fromUser.email?.split('@')[0] ||
    'Usuario'

  const initialAvatar = request.fromUser.profile?.avatar || ''
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayLabel)}&background=1E1E1E&color=73FFA2&size=128&bold=true`
  const [imgSrc, setImgSrc] = useState(initialAvatar || fallbackAvatar)

  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2 sm:gap-3 sm:px-2.5">
        <Link
          href={profilePath(request.fromUser)}
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/15 bg-zinc-800/80 ring-1 ring-black/15 transition-[transform,opacity] hover:opacity-95"
          aria-label={`Perfil ${displayLabel}`}
        >
          <Image
            src={imgSrc}
            alt=""
            width={44}
            height={44}
            className="h-full w-full object-cover"
            unoptimized={
              Boolean(imgSrc) &&
              (imgSrc.startsWith('http') || imgSrc.startsWith('data:') || imgSrc.includes('ui-avatars'))
            }
            referrerPolicy="no-referrer"
            onError={() => {
              if (imgSrc !== fallbackAvatar) setImgSrc(fallbackAvatar)
            }}
          />
        </Link>

        <div className="min-w-0 flex-1 overflow-hidden py-0.5">
          <p
            className="truncate text-[13px] font-medium leading-tight text-zinc-100"
            title={displayLabel}
          >
            {displayLabel}
          </p>
          {request.fromUser.username?.trim() && fullName !== 'Sin nombre' && (
            <p className="truncate text-[11px] text-zinc-500">{fullName}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isProcessing}
            className="rounded-full bg-[#73FFA2] px-3 py-1 text-[11px] font-semibold leading-tight text-zinc-900 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? '…' : 'Aceptar'}
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isProcessing}
            className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-medium leading-tight text-zinc-400 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-zinc-200 disabled:opacity-50"
          >
            Rechazar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.1] sm:p-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href={profilePath(request.fromUser)}
          className="relative aspect-square h-14 w-14 shrink-0 overflow-hidden rounded-full bg-zinc-800/80 sm:h-16 sm:w-16"
        >
          {initialAvatar ? (
            <Image
              src={initialAvatar}
              alt=""
              width={64}
              height={64}
              className="h-full w-full object-cover"
              unoptimized={initialAvatar.startsWith('http')}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-500 sm:text-base">
              {(request.fromUser.firstName?.[0] || request.fromUser.email?.[0] || 'U').toUpperCase()}
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          {request.fromUser.username ? (
            <>
              <h3 className="truncate font-medium text-zinc-100">{request.fromUser.username}</h3>
              {fullName !== 'Sin nombre' && (
                <p className="truncate text-sm text-zinc-500">{fullName}</p>
              )}
            </>
          ) : (
            <>
              <h3 className="truncate font-medium text-zinc-100">{fullName}</h3>
              <p className="truncate text-sm text-zinc-500">{request.fromUser.email}</p>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isProcessing}
            className="whitespace-nowrap rounded-lg bg-[#73FFA2] px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-90 disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
          >
            {isProcessing ? '…' : 'Aceptar'}
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isProcessing}
            className="whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-400 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-colors hover:bg-white/[0.07] hover:text-zinc-200 disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  )
}
