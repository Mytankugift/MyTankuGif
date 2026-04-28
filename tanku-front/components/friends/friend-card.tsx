/**
 * Amigo — cuadrícula (referencia estilo glass/teal) o fila lista; sin estados en línea
 */

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GiftIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { useFriends } from '@/lib/hooks/use-friends'
import { FriendCardOptionsModal } from '@/components/friends/friend-card-options-modal'
import type { FriendDTO } from '@/types/api'

/** Primario teal + outline — inner shadow siempre; en viewport menor a md, botones más compactos */
const LINK_MSG =
  'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#66DEDB] text-center font-semibold text-zinc-900 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-95 max-md:gap-1 max-md:rounded-lg max-md:py-1.5 max-md:text-[10px] max-md:leading-tight md:py-2.5 md:text-xs'

const LINK_GIFT =
  'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.12] bg-black/20 text-center font-semibold text-zinc-100 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-colors hover:border-[#66DEDB]/35 hover:bg-white/[0.04] max-md:gap-1 max-md:rounded-lg max-md:py-1.5 max-md:text-[10px] max-md:leading-tight md:py-2.5 md:text-xs'

const ICON_BTN = 'h-4 w-4 shrink-0 max-md:h-3 max-md:w-3'

function profilePathFromFriend(f: FriendDTO['friend']) {
  return f.username ? `/profile/${f.username}` : `/profile/${f.id}`
}

function wishlistPathFromFriend(f: FriendDTO['friend']) {
  return `${profilePathFromFriend(f)}?tab=wishlists`
}

export type FriendCardLayout = 'grid' | 'list'

interface FriendCardProps {
  friend: FriendDTO
  onRefresh: () => void
  groups: Array<{ id: string; name: string }>
  layout?: FriendCardLayout
}

export function FriendCard({ friend, onRefresh, groups, layout = 'grid' }: FriendCardProps) {
  const router = useRouter()
  const { removeFriend, blockUser } = useFriends()
  const [isRemoving, setIsRemoving] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const profilePath = profilePathFromFriend(friend.friend)
  const userId = friend.friendId

  const handleRemove = async () => {
    if (
      !confirm(
        `¿Quitar a ${friend.friend.firstName || 'este amigo'} de tu lista de amigos?`,
      )
    ) {
      return
    }
    setIsRemoving(true)
    try {
      await removeFriend(friend.friend.id)
      setIsMenuOpen(false)
      onRefresh()
    } catch (error) {
      console.error('Error eliminando amigo:', error)
      alert(error instanceof Error ? error.message : 'Error al eliminar amigo')
    } finally {
      setIsRemoving(false)
    }
  }

  const handleBlock = async () => {
    if (!confirm(`¿Bloquear a ${friend.friend.firstName || 'este usuario'}?`)) {
      return
    }
    setIsBlocking(true)
    try {
      await blockUser(friend.friendId)
      setIsMenuOpen(false)
      onRefresh()
    } catch (error) {
      console.error('Error bloqueando usuario:', error)
    } finally {
      setIsBlocking(false)
    }
  }

  const fullName =
    `${friend.friend.firstName || ''} ${friend.friend.lastName || ''}`.trim() || 'Sin nombre'
  const initialAvatar = friend.friend.profile?.avatar || ''
  const [imgSrc, setImgSrc] = useState<string>(initialAvatar)

  const groupLabel =
    groups.length > 0 ? groups.map((g) => g.name).join(' · ') : null

  const primaryLabel = friend.friend.username?.trim() || fullName
  const secondaryLine = friend.friend.username?.trim()
    ? `@${friend.friend.username}`
    : fullName !== 'Sin nombre'
      ? fullName
      : null

  const menuButton = (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsMenuOpen(true)
      }}
      className="rounded-full bg-black/50 p-1.5 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/70"
      aria-label="Más opciones"
      aria-haspopup="dialog"
      aria-expanded={isMenuOpen}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
      </svg>
    </button>
  )

  const optionsModalEl = (
    <FriendCardOptionsModal
      open={isMenuOpen}
      onClose={() => setIsMenuOpen(false)}
      title={primaryLabel.length > 36 ? `${primaryLabel.slice(0, 34)}…` : primaryLabel}
      onBlock={() => void handleBlock()}
      onRemove={() => void handleRemove()}
      isBlocking={isBlocking}
      isRemoving={isRemoving}
    />
  )

  const cardShell =
    'rounded-2xl border border-[#66DEDB]/30 bg-white/[0.03] shadow-[0_8px_32px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] hover:border-[#66DEDB]/45 hover:shadow-[0_12px_40px_rgba(0,0,0,0.32)]'

  const listActions = (
    <div className="flex w-full flex-1 flex-row flex-wrap gap-1.5 sm:flex-nowrap md:gap-2">
      <Link href={wishlistPathFromFriend(friend.friend)} className={`${LINK_GIFT}`}>
        <GiftIcon className={`${ICON_BTN} text-[#66DEDB]`} aria-hidden />
        Enviar{' '}
        <span className="font-semibold uppercase">TANKU</span>
      </Link>
      <Link href={`/messages?userId=${userId}`} className={LINK_MSG}>
        <PaperAirplaneIcon className={ICON_BTN} aria-hidden />
        Mensaje
      </Link>
    </div>
  )

  const gridActions = (
    <div className="flex w-full flex-1 flex-row flex-wrap gap-1.5 sm:flex-nowrap lg:gap-2">
      <Link href={wishlistPathFromFriend(friend.friend)} className={`${LINK_GIFT} lg:py-2.5`}>
        <GiftIcon className={`hidden lg:inline ${ICON_BTN} text-[#66DEDB]`} aria-hidden />
        Enviar{' '}
        <span className="font-semibold uppercase">TANKU</span>
      </Link>
      <Link href={`/messages?userId=${userId}`} className={`${LINK_MSG} lg:py-2.5`}>
        <PaperAirplaneIcon className={`hidden lg:inline ${ICON_BTN}`} aria-hidden />
        Mensaje
      </Link>
    </div>
  )

  if (layout === 'list') {
    const profileAvatarBtn = (
      <button
        type="button"
        onClick={() => router.push(profilePath)}
        className="relative h-[4.25rem] w-[4.25rem] shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-900/80 ring-1 ring-[#66DEDB]/15"
        aria-label="Ver perfil"
      >
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt=""
            fill
            className="object-cover"
            sizes="68px"
            onError={() => setImgSrc('')}
            referrerPolicy="no-referrer"
            unoptimized={imgSrc.startsWith('http')}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-base font-bold text-zinc-500">
            {(friend.friend.firstName?.[0] || friend.friend.email?.[0] || 'U').toUpperCase()}
          </div>
        )}
      </button>
    )

    const nameBlock = (
      <button
        type="button"
        onClick={() => router.push(profilePath)}
        className="w-full text-left"
      >
        <p className="truncate text-sm font-semibold text-zinc-50">{primaryLabel}</p>
        {secondaryLine && (
          <p className="truncate text-xs text-zinc-500">{secondaryLine}</p>
        )}
      </button>
    )

    const redTankuLine =
      groupLabel && (
        <p className="line-clamp-1 text-[10px] text-zinc-600 sm:mt-1" title={groupLabel}>
          <span className="text-zinc-500">Red TANKU</span> · {groupLabel}
        </p>
      )

    return (
      <>
        <div className={`relative flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${cardShell}`}>
          <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">{menuButton}</div>

          <div className="flex flex-col gap-3 pr-10 sm:hidden">
            <div className="flex min-w-0 flex-row gap-3">
              {profileAvatarBtn}
              <div className="flex min-h-[4.25rem] min-w-0 flex-1 flex-col justify-center py-0.5">
                {nameBlock}
              </div>
            </div>
            {redTankuLine}
            <div className="w-full">{listActions}</div>
          </div>

          <div className="hidden w-full flex-1 flex-row items-center gap-4 sm:flex sm:min-w-0">
            {profileAvatarBtn}
            <div className="min-w-0 flex-1 pr-10 sm:pr-12">
              {nameBlock}
              {redTankuLine}
            </div>
            <div className="flex w-full min-w-0 sm:max-w-[min(100%,20rem)] sm:shrink-0 sm:pr-10 md:pr-12 lg:pr-14">
              {listActions}
            </div>
          </div>
        </div>
        {optionsModalEl}
      </>
    )
  }

  /* —— grid —— avatar centrado en hueco cuadrado + laterales con color difuminado -- */
  return (
    <>
      <div className={`relative flex h-full flex-col overflow-hidden ${cardShell}`}>
        <div className="relative w-full shrink-0 overflow-hidden rounded-t-2xl bg-zinc-950/95">
        {imgSrc ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <Image
              src={imgSrc}
              alt=""
              fill
              sizes="240px"
              className="scale-[1.4] object-cover blur-3xl brightness-[0.92] saturate-150"
              unoptimized={imgSrc.startsWith('http')}
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/35 to-black/55" />
            <div className="absolute inset-y-0 left-0 w-[32%] bg-gradient-to-r from-black/65 via-black/25 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-[32%] bg-gradient-to-l from-black/65 via-black/25 to-transparent" />
          </div>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(63,63,70,0.55)_0%,_rgba(9,9,11,0.92)_72%)]"
            aria-hidden
          />
        )}

        <div className="relative z-[1] flex aspect-[5/2] w-full items-center justify-center px-3 py-2.5 sm:px-4 sm:py-3">
          <button
            type="button"
            onClick={() => router.push(profilePath)}
            className="relative aspect-square w-[64%] max-w-[7.875rem] min-h-[5.25rem] min-w-[5.25rem] overflow-hidden rounded-full bg-zinc-900/30 shadow-[0_14px_48px_rgba(0,0,0,0.55)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
            aria-label="Ver perfil"
          >
            {imgSrc ? (
              <Image
                src={imgSrc}
                alt=""
                fill
                className="object-cover object-center"
                sizes="128px"
                onError={() => setImgSrc('')}
                referrerPolicy="no-referrer"
                unoptimized={imgSrc.startsWith('http')}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900 text-xl font-bold text-zinc-400">
                {(friend.friend.firstName?.[0] || friend.friend.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex justify-end p-2">
          <div className="pointer-events-auto">{menuButton}</div>
        </div>
      </div>

      <div
        className="relative mt-0 flex flex-1 flex-col gap-2 rounded-b-2xl border-t border-white/[0.12] bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-[#141a1d]/95 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl backdrop-saturate-150 sm:p-3.5"
      >
        <div className="pointer-events-none absolute inset-0 rounded-b-2xl bg-[radial-gradient(120%_80%_at_50%_-20%,rgba(102,222,219,0.12),transparent_58%)]" aria-hidden />

        <div className="relative z-[1]">
          <button
            type="button"
            onClick={() => router.push(profilePath)}
            className="w-full text-left"
          >
            <p className="line-clamp-1 text-sm font-semibold text-zinc-50">{primaryLabel}</p>
            {secondaryLine && (
              <p className="line-clamp-1 text-xs text-zinc-400">{secondaryLine}</p>
            )}
          </button>

          {groupLabel ? (
            <p className="line-clamp-2 pt-0.5 text-[10px] leading-snug text-zinc-500" title={groupLabel}>
              <span className="text-zinc-400">Red TANKU</span> · {groupLabel}
            </p>
          ) : (
            <p className="pt-0.5 text-[10px] text-zinc-500">Red TANKU — sin grupos</p>
          )}

          <div className="mt-3 pt-0.5">{gridActions}</div>
        </div>
      </div>
    </div>
    {optionsModalEl}
    </>
  )
}
