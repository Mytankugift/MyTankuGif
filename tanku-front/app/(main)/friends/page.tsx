/**
 * Amigos — pestañas Amigos · Sugerencias · Solicitudes; orden y vista lista en una fila (solo Amigos)
 */

'use client'

import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { clsx } from 'clsx'
import {
  UserGroupIcon,
  UserPlusIcon,
  SparklesIcon,
  Squares2X2Icon,
  QueueListIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline'
import { useFriends } from '@/lib/hooks/use-friends'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import {
  FriendsList,
  FRIENDS_PAGE_INITIAL,
  FRIENDS_LOAD_STEP,
  type FriendsViewMode,
} from '@/components/friends/friends-list'
import type { TankuCustomSelectOption } from '@/components/ui/tanku-custom-select'
import { FriendsSortSheet } from '@/components/friends/friends-sort-sheet'
import { FriendRequestList } from '@/components/friends/friend-request-list'
import { SuggestionCard } from '@/components/friends/suggestion-card'
import {
  FriendsNavSearchDropdown,
  type FriendsNavSearchHit,
} from '@/components/friends/friends-nav-search-dropdown'
import { FriendsPageSearchBar } from '@/components/friends/friends-page-search-bar'
import { FriendsPublicProfileUrlCard } from '@/components/friends/friends-public-profile-url-card'
import { BaseNav } from '@/components/layout/base-nav'
import { NavBackToFeedLink } from '@/components/layout/nav-back-to-feed'
import type { FriendDTO, FriendSuggestionDTO } from '@/types/api'

function matchesNameOrUsername(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  username: string | null | undefined,
  qLower: string,
): boolean {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim().toLowerCase()
  const u = (username || '').toLowerCase()
  return fullName.includes(qLower) || u.includes(qLower)
}

interface Group {
  id: string
  name: string
  members: Array<{
    id: string
    userId: string
    user?: {
      id: string
      email: string
      firstName: string | null
      lastName: string | null
    }
  }>
}

type FriendGroupMap = Record<string, Array<{ id: string; name: string }>>

type FriendsMainTab = 'friends' | 'requests' | 'suggestions'

/** Vista previa lateral: solo lo más reciente; “ver todas” abre la pestaña */
const PREVIEW_REQUESTS = 3
const SIDEBAR_SUGGESTIONS_MAX = 8

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#73FFA2]/22 px-1.5 py-0 text-[10px] font-semibold tabular-nums text-[#73FFA2]">
      {count > 99 ? '99+' : count}
    </span>
  )
}

/** Cabecera de bloque tipo referencia (título · badge opcional · acción derecha) */
function PanelSectionHead({
  id,
  title,
  badge,
  extra,
}: {
  id?: string
  title: string
  badge?: ReactNode
  extra?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-nowrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
      <div className="flex min-w-0 flex-nowrap items-center gap-2">
        <h2 id={id} className="truncate text-[15px] font-semibold text-zinc-100 sm:text-base">
          {title}
        </h2>
        {badge !== undefined && badge !== null ? badge : null}
      </div>
      {extra ? <div className="shrink-0">{extra}</div> : null}
    </div>
  )
}

const GLASS_PANEL =
  'w-full min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-[0_12px_40px_rgba(0,0,0,0.2)] backdrop-blur-sm'

/** Opciones orden amigos — reutilizado en TankuCustomSelect (<lg escritorio) y FriendsSortSheet (móvil/tablet). */
const FRIENDS_SORT_OPTIONS = [
  { value: 'recent', label: 'Recientes' },
  { value: 'alphabetical', label: 'Orden alfabético' },
] satisfies TankuCustomSelectOption[]

export default function FriendsPage() {
  const {
    friends,
    requests,
    suggestions,
    isLoading,
    error,
    fetchFriends,
    fetchRequests,
    fetchSuggestions,
  } = useFriends()

  const [groups, setGroups] = useState<Group[]>([])

  const groupByFriendId = useMemo<FriendGroupMap>(() => {
    const map: FriendGroupMap = {}
    groups.forEach((group) => {
      group.members?.forEach((member) => {
        const friendId = member.userId || member.user?.id
        if (friendId) {
          if (!map[friendId]) {
            map[friendId] = []
          }
          map[friendId].push({
            id: group.id,
            name: group.name,
          })
        }
      })
    })
    return map
  }, [groups])

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const response = await apiClient.get<Group[]>(API_ENDPOINTS.GROUPS.LIST)
        if (response.success && response.data) {
          setGroups(Array.isArray(response.data) ? response.data : [])
        }
      } catch (e) {
        console.error('Error al cargar grupos:', e)
      }
    }
    loadGroups()
  }, [])

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchFriends(), fetchRequests(), fetchSuggestions()])
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [searchQuery, setSearchQuery] = useState('')
  const [friendSearchResults, setFriendSearchResults] = useState<FriendSuggestionDTO[] | null>(null)
  const [isFriendSearchLoading, setIsFriendSearchLoading] = useState(false)
  const [navSearchFocused, setNavSearchFocused] = useState(false)

  const [friendsVisibleCount, setFriendsVisibleCount] = useState(FRIENDS_PAGE_INITIAL)

  const [mainTab, setMainTab] = useState<FriendsMainTab>('friends')

  const [friendsSort, setFriendsSort] = useState<'recent' | 'alphabetical'>('recent')
  const [friendsView, setFriendsView] = useState<FriendsViewMode>('grid')
  const [friendsSortSheetOpen, setFriendsSortSheetOpen] = useState(false)

  const friendsSortLabel = useMemo(
    () => FRIENDS_SORT_OPTIONS.find((o) => o.value === friendsSort)?.label ?? 'Orden',
    [friendsSort],
  )

  const friendsDisplayedSorted = useMemo(() => {
    const base = [...friends] as FriendDTO[]
    const sortKey = (f: FriendDTO) => {
      const u = (f.friend.username || '').toLowerCase().trim()
      const name = `${f.friend.firstName || ''} ${f.friend.lastName || ''}`.trim().toLowerCase()
      return u || name || (f.friend.email || '').toLowerCase()
    }
    if (friendsSort === 'alphabetical') {
      base.sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'es', { sensitivity: 'base' }))
      return base
    }
    base.sort((a, b) => {
      const t = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      if (t !== 0) return t
      const ga = groupByFriendId[a.friendId]?.length ?? 0
      const gb = groupByFriendId[b.friendId]?.length ?? 0
      if (gb !== ga) return gb - ga
      return (b.mutualFriendsCount ?? 0) - (a.mutualFriendsCount ?? 0)
    })
    return base
  }, [friends, friendsSort, groupByFriendId])

  const searchTrim = searchQuery.trim()

  /** Sugerencias de la pestaña y del lateral — independientes del texto del buscador */
  const sortedSuggestionsForPage = useMemo(
    () =>
      [...suggestions].sort(
        (a, b) => (b.mutualFriendsCount ?? 0) - (a.mutualFriendsCount ?? 0),
      ),
    [suggestions],
  )

  const navSearchDropdownLoading = searchTrim.length >= 2 && isFriendSearchLoading

  /** Coincidencias para el desplegable del nav: amigos locales + respuesta del API (≥2 caracteres). */
  const navSearchHits = useMemo((): FriendsNavSearchHit[] => {
    const qLower = searchTrim.toLowerCase()
    if (!qLower) return []

    const seen = new Set<string>()
    const fromFriends: FriendsNavSearchHit[] = []

    for (const f of friends) {
      if (!matchesNameOrUsername(f.friend.firstName, f.friend.lastName, f.friend.username, qLower)) {
        continue
      }
      const uid = f.friend.id
      seen.add(uid)
      const fullName =
        `${f.friend.firstName || ''} ${f.friend.lastName || ''}`.trim() || 'Sin nombre'
      const un = f.friend.username?.trim()
      const profilePath = un ? `/profile/${un}` : `/profile/${uid}`
      fromFriends.push({
        key: `friend-${f.id}`,
        href: profilePath,
        avatar: f.friend.profile?.avatar,
        title: un ? `@${un}` : fullName,
        subtitle: 'En tu lista de amigos',
      })
    }
    fromFriends.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }))

    const fromApi: FriendsNavSearchHit[] = []
    if (searchTrim.length >= 2 && Array.isArray(friendSearchResults)) {
      const sortedRemote = [...friendSearchResults].sort(
        (a, b) => (b.mutualFriendsCount ?? 0) - (a.mutualFriendsCount ?? 0),
      )
      for (const s of sortedRemote) {
        if (seen.has(s.userId)) continue
        seen.add(s.userId)
        const fullName =
          `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() || 'Sin nombre'
        const un = s.user.username?.trim()
        const profilePath = un ? `/profile/${un}` : `/profile/${s.userId}`
        const mutual = s.mutualFriendsCount ?? 0
        fromApi.push({
          key: `remote-${s.userId}`,
          href: profilePath,
          avatar: s.user.profile?.avatar,
          title: un ? `@${un}` : fullName,
          subtitle:
            mutual > 0
              ? `${mutual} contacto${mutual === 1 ? '' : 's'} en común`
              : undefined,
        })
      }
    }

    return [...fromFriends, ...fromApi]
  }, [friends, friendSearchResults, searchTrim])

  useEffect(() => {
    if (searchTrim.length < 2) {
      setFriendSearchResults(null)
      return
    }

    let cancelled = false
    const t = window.setTimeout(async () => {
      setIsFriendSearchLoading(true)
      try {
        const url = `${API_ENDPOINTS.FRIENDS.SEARCH}?q=${encodeURIComponent(searchTrim)}`
        const response = await apiClient.get<FriendSuggestionDTO[]>(url)
        if (cancelled) return
        if (response.success && Array.isArray(response.data)) {
          setFriendSearchResults(response.data)
        } else {
          setFriendSearchResults([])
        }
      } catch {
        if (!cancelled) setFriendSearchResults([])
      } finally {
        if (!cancelled) setIsFriendSearchLoading(false)
      }
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [searchTrim])

  const requestsPreview = useMemo(() => requests.slice(0, PREVIEW_REQUESTS), [requests])
  const sidebarSuggestions = useMemo(
    () => sortedSuggestionsForPage.slice(0, SIDEBAR_SUGGESTIONS_MAX),
    [sortedSuggestionsForPage],
  )

  const showNavSearchDropdown = navSearchFocused && searchTrim.length > 0
  const onSendSuggestion = async (friendId: string) => {
    setFriendSearchResults((prev) => (prev ? prev.filter((s) => s.userId !== friendId) : prev))
    await fetchSuggestions()
  }

  const onRequestAnswered = async () => {
    await fetchRequests()
    await fetchFriends()
  }

  return (
    <div
      className="relative z-0 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
    >
      <div className="pointer-events-none relative z-40 h-0 shrink-0 overflow-visible">
        <BaseNav
          showStories={false}
          canHide={false}
          isVisible={true}
          pageTitle="Amigos"
          pageTitleColor="#FFFFFF"
          mobileBackCenterTitleCartOnly
          mobileTranslucentNav
          desktopNavTitleCentered
          startContent={<NavBackToFeedLink />}
          className="pointer-events-auto"
          additionalContent={
            <FriendsPageSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSearchFocus={() => setNavSearchFocused(true)}
              onSearchBlur={() => setNavSearchFocused(false)}
              searchDropdownSlot={
                showNavSearchDropdown ? (
                  <FriendsNavSearchDropdown
                    hits={navSearchHits}
                    loading={navSearchDropdownLoading}
                  />
                ) : undefined
              }
            />
          }
        />
      </div>

      {/*
        Más `pt` que /wishlist o /profile: el BaseNav incluye `FriendsPageSearchBar` (fila extra debajo del título).
      */}
      <div
        id="friends-scroll-root"
        className={clsx(
          'custom-scrollbar relative z-0 min-h-0 w-full flex-1 basis-0 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]',
          'px-4 pt-[max(8rem,calc(env(safe-area-inset-top,0px)+7rem))] pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]',
          'lg:px-8 lg:pb-8 lg:pt-28 xl:px-10 xl:pt-32',
        )}
        style={{
          marginRight: '0',
          scrollBehavior: 'auto',
          scrollPaddingTop: 'max(env(safe-area-inset-top),12px)',
          scrollPaddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="w-full pb-4">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
            <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col lg:min-w-[min(100%,calc(100%-21rem))]">
              {/* Pestañas a ancho del módulo; en Amigos, orden/vista a la derecha en la misma fila (lg+) */}
              <div
                className={clsx(
                  'mb-4 flex w-full min-w-0 flex-col gap-3 sm:mb-5 sm:gap-4',
                  mainTab === 'friends' && 'lg:flex-row lg:items-stretch lg:gap-3',
                )}
              >
                <nav
                  className={clsx(
                    'flex min-h-[2.75rem] w-full min-w-0 flex-nowrap gap-1 rounded-2xl border border-white/[0.08] bg-black/[0.25] p-1 shadow-inner sm:p-1.5',
                    mainTab === 'friends' && 'lg:min-w-0 lg:flex-1',
                  )}
                  aria-label="Contenido principal: Amigos, Sugerencias o Solicitudes"
                >
                  <button
                    type="button"
                    onClick={() => setMainTab('friends')}
                    className={clsx(
                      'flex min-h-[2.75rem] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-[11px] font-semibold transition-all sm:flex-row sm:gap-2 sm:px-2 sm:text-sm lg:justify-center lg:px-2 lg:text-sm',
                      mainTab === 'friends'
                        ? 'bg-[#66DEDB]/16 text-[#66DEDB] shadow-[inset_0_0_0_1px_rgba(102,222,219,0.35)]'
                        : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300',
                    )}
                  >
                    <UserGroupIcon className="h-5 w-5 shrink-0 sm:h-[1.35rem] sm:w-[1.35rem]" aria-hidden />
                    <span className="flex min-w-0 max-w-full items-center truncate">
                      Amigos
                      <TabBadge count={friends.length} />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainTab('suggestions')}
                    className={clsx(
                      'flex min-h-[2.75rem] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-[11px] font-semibold transition-all sm:flex-row sm:gap-2 sm:px-2 sm:text-sm lg:justify-center lg:px-2 lg:text-sm',
                      mainTab === 'suggestions'
                        ? 'bg-[#66DEDB]/16 text-[#66DEDB] shadow-[inset_0_0_0_1px_rgba(102,222,219,0.35)]'
                        : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300',
                    )}
                  >
                    <SparklesIcon className="h-5 w-5 shrink-0 sm:h-[1.35rem] sm:w-[1.35rem]" aria-hidden />
                    <span className="flex min-w-0 max-w-full items-center truncate">
                      Sugerencias
                      <TabBadge count={sortedSuggestionsForPage.length} />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainTab('requests')}
                    className={clsx(
                      'flex min-h-[2.75rem] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-[11px] font-semibold transition-all sm:flex-row sm:gap-2 sm:px-2 sm:text-sm lg:justify-center lg:px-2 lg:text-sm',
                      mainTab === 'requests'
                        ? 'bg-[#66DEDB]/16 text-[#66DEDB] shadow-[inset_0_0_0_1px_rgba(102,222,219,0.35)]'
                        : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300',
                    )}
                  >
                    <UserPlusIcon className="h-5 w-5 shrink-0 sm:h-[1.35rem] sm:w-[1.35rem]" aria-hidden />
                    <span className="flex min-w-0 max-w-full items-center truncate">
                      Solicitudes
                      <TabBadge count={requests.length} />
                    </span>
                  </button>
                </nav>

                {mainTab === 'friends' ? (
                  <div
                    className="flex min-h-[2.75rem] w-full shrink-0 items-center justify-end lg:w-auto"
                    role="group"
                    aria-label="Orden y vista de amigos"
                  >
                    <div className="flex shrink-0 rounded-xl border border-white/10 p-0.5">
                      <button
                        type="button"
                        onClick={() => setFriendsSortSheetOpen(true)}
                        aria-haspopup="listbox"
                        aria-expanded={friendsSortSheetOpen}
                        aria-label={`Orden: ${friendsSortLabel}. Abrir opciones`}
                        title={`Orden: ${friendsSortLabel}`}
                        className={clsx(
                          'rounded-lg p-2 transition-colors',
                          friendsSortSheetOpen
                            ? 'bg-[#66DEDB]/20 text-[#66DEDB]'
                            : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300',
                        )}
                      >
                        <ArrowsUpDownIcon className="h-5 w-5 shrink-0" aria-hidden />
                        <span className="sr-only">Orden</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFriendsView('grid')}
                        aria-pressed={friendsView === 'grid'}
                        className={clsx(
                          'rounded-lg p-2 transition-colors',
                          friendsView === 'grid'
                            ? 'bg-[#66DEDB]/20 text-[#66DEDB]'
                            : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300',
                        )}
                        title="Cuadrícula"
                      >
                        <Squares2X2Icon className="h-5 w-5" aria-hidden />
                        <span className="sr-only">Vista cuadrícula</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFriendsView('list')}
                        aria-pressed={friendsView === 'list'}
                        className={clsx(
                          'rounded-lg p-2 transition-colors',
                          friendsView === 'list'
                            ? 'bg-[#66DEDB]/20 text-[#66DEDB]'
                            : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300',
                        )}
                        title="Lista"
                      >
                        <QueueListIcon className="h-5 w-5" aria-hidden />
                        <span className="sr-only">Vista lista</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

          {mainTab === 'friends' && (
            <>
              <FriendsList
                friends={friendsDisplayedSorted}
                isLoading={isLoading}
                onRefresh={fetchFriends}
                groupByFriendId={groupByFriendId}
                visibleCount={friendsVisibleCount}
                viewMode={friendsView}
                onLoadMore={() =>
                  setFriendsVisibleCount((n) =>
                    Math.min(n + FRIENDS_LOAD_STEP, friendsDisplayedSorted.length),
                  )
                }
              />
            </>
          )}

          {mainTab === 'requests' && (
            <section
              className={clsx(
                'relative flex flex-col p-3 sm:p-4 md:min-h-[min(62vh,34rem)]',
                GLASS_PANEL,
              )}
              aria-labelledby="friends-requests-heading"
            >
              <PanelSectionHead id="friends-requests-heading" title="Solicitudes" />
              <FriendRequestList
                requests={requests}
                isLoading={isLoading && requests.length === 0}
                compact
                onAccept={onRequestAnswered}
                onReject={async () => {
                  await fetchRequests()
                }}
              />
            </section>
          )}

          {mainTab === 'suggestions' && (
            <section
              className={clsx(
                'relative flex flex-col p-3 sm:p-4 md:min-h-[min(62vh,34rem)]',
                GLASS_PANEL,
              )}
              aria-labelledby="friends-suggestions-heading"
            >
              <PanelSectionHead id="friends-suggestions-heading" title="Sugerencias para ti" />
              {isLoading && sortedSuggestionsForPage.length === 0 ? (
                <div className="py-14 text-center text-sm text-zinc-500">Cargando…</div>
              ) : sortedSuggestionsForPage.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/10 py-12 text-center text-sm text-zinc-500">
                  No hay sugerencias ahora.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {sortedSuggestionsForPage.map((s) => (
                    <SuggestionCard
                      key={s.userId}
                      suggestion={s}
                      variant="strip"
                      onSendRequest={onSendSuggestion}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
            </div>

            {/* Lateral: vistas previas; sin scroll propio (solo #friends-scroll-root) */}
            <aside
              className="hidden shrink-0 lg:sticky lg:top-2 lg:block lg:w-[min(20rem,100%)] lg:self-start"
              aria-label="Resumen: solicitudes y sugerencias"
            >
              {requests.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4">
                  <div className="mb-3 flex flex-nowrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500 sm:text-sm">
                      Solicitudes
                    </h3>
                    <button
                      type="button"
                      onClick={() => setMainTab('requests')}
                      className="shrink-0 rounded-md border border-[#66DEDB]/30 px-2 py-1 text-[11px] font-semibold text-[#66DEDB] transition-colors hover:border-[#73FFA2]/45 hover:bg-[#66DEDB]/10"
                    >
                      Ver todas
                    </button>
                  </div>
                  <FriendRequestList
                    requests={requestsPreview}
                    isLoading={false}
                    compact
                    onAccept={onRequestAnswered}
                    onReject={async () => {
                      await fetchRequests()
                    }}
                  />
                </div>
              )}

              <div
                className={clsx(
                  'rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4',
                  requests.length > 0 ? 'mt-4' : '',
                )}
              >
                <div className="mb-3 flex w-full min-w-0 flex-nowrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                  <h2 className="min-w-0 shrink text-xs font-medium uppercase tracking-wide text-zinc-500 sm:text-sm">
                    Sugerencias
                  </h2>
                  {sortedSuggestionsForPage.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMainTab('suggestions')}
                      className="shrink-0 rounded-md border border-[#73FFA2]/35 px-2 py-1 text-[11px] font-semibold text-[#73FFA2] transition-colors hover:bg-[#73FFA2]/10"
                    >
                      Ver más
                    </button>
                  )}
                </div>
                {sidebarSuggestions.length === 0 && !isLoading ? (
                  <p className="rounded-lg border border-dashed border-white/10 py-5 text-center text-xs text-zinc-500">
                    No hay sugerencias ahora.
                  </p>
                ) : isLoading && suggestions.length === 0 && sidebarSuggestions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">Cargando…</div>
                ) : (
                  <div className="flex flex-col gap-2 pt-0.5">
                    {sidebarSuggestions.map((s) => (
                      <SuggestionCard
                        key={s.userId}
                        suggestion={s}
                        variant="strip"
                        onSendRequest={onSendSuggestion}
                      />
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <FriendsSortSheet
              open={friendsSortSheetOpen}
              onClose={() => setFriendsSortSheetOpen(false)}
              options={FRIENDS_SORT_OPTIONS}
              value={friendsSort}
              onChange={(v) => setFriendsSort(v as 'recent' | 'alphabetical')}
            />
          </div>
        </div>
      </div>

      <FriendsPublicProfileUrlCard />
    </div>
  )
}
