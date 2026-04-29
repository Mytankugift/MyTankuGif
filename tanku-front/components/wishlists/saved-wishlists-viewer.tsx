'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useWishlistExpandList } from '@/lib/hooks/use-wishlist-expand-list'
import {
  WishlistAccordionCard,
  WishlistAccordionEllipsisButton,
} from '@/components/wishlists/wishlist-accordion-card'
import { WishlistInlineProducts } from '@/components/wishlists/wishlist-inline-products'
import type { WishListDTO } from '@/types/api'

interface SavedWishlist extends WishListDTO {
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    profile?: {
      avatar: string | null
    } | null
  }
}

interface UserAvatarWithHexagonProps {
  userData: { user: SavedWishlist['user']; wishlists: SavedWishlist[] }
  isSelected: boolean
  onSelect: () => void
}

function UserAvatarWithHexagon({ userData, isSelected, onSelect }: UserAvatarWithHexagonProps) {
  const fullName = `${userData.user.firstName || ''} ${userData.user.lastName || ''}`.trim() || 'Sin nombre'
  const avatarUrl =
    userData.user.profile?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1E1E1E&color=73FFA2&size=64`
  const [imgSrc, setImgSrc] = useState<string>(avatarUrl)

  return (
    <div className="group relative cursor-pointer" onClick={onSelect}>
      <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-gray-700 transition-all duration-300">
        <Image
          src={imgSrc}
          alt={fullName}
          fill
          className="object-cover"
          onError={() =>
            setImgSrc(
              `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1E1E1E&color=73FFA2&size=64`,
            )
          }
          referrerPolicy="no-referrer"
          unoptimized
        />
      </div>

      {isSelected && (
        <div className="pointer-events-none absolute inset-0">
          <svg
            width="120"
            height="100"
            viewBox="0 0 120 100"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform"
            style={{ filter: 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.5))' }}
          >
            <polygon
              points="
              60,6
              96,25
              96,75
              60,94
              24,75
              24,25
              "
              fill="none"
              stroke="#73FFA2"
              strokeWidth="2.5"
              className="animate-pulse"
            />
          </svg>
        </div>
      )}

      {/*
        Tooltip: en md+ el rail lateral (z-50) tapa overlays dentro de main; evitar superposición
        mostrando la etiqueta a la derecha del avatar en lugar de centrada arriba.
      */}
      <div
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 md:bottom-auto md:left-full md:top-1/2 md:mb-0 md:ml-2 md:translate-x-0 md:-translate-y-1/2"
      >
        <div className="whitespace-nowrap rounded-lg border border-[#73FFA2]/50 bg-gray-900 px-2 py-1 text-xs text-white shadow-lg shadow-black/40">
          {fullName}
        </div>
      </div>
    </div>
  )
}

const quitarWishlistDesktopCls =
  'inline-flex shrink-0 items-center justify-center rounded-xl border border-red-500/45 bg-black/35 px-3 py-2 text-[11px] font-medium text-red-400 transition-colors hover:border-red-400/65 hover:bg-red-500/10 sm:text-xs'

export function SavedWishlistsViewer() {
  const { isAuthenticated, user } = useAuthStore()
  const [savedWishlists, setSavedWishlists] = useState<SavedWishlist[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [confirmingUnsave, setConfirmingUnsave] = useState<string | null>(null)
  const [mobileActionsWishlistId, setMobileActionsWishlistId] = useState<string | null>(null)

  const { expandedWishlistId, mountedProductWishlistId, toggleWishlistExpanded, resetExpandList } =
    useWishlistExpandList()

  const noopRemoveFromList = async () => {}

  const fetchSavedWishlists = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return

    setIsLoading(true)
    try {
      const response = await apiClient.get<any[]>(API_ENDPOINTS.WISHLISTS.SAVED)
      if (response.success && response.data) {
        const transformed = response.data.map((w: any) => ({
          ...w,
          userId: w.userId || w.owner?.id || w.user?.id,
          user: w.user || w.owner || {
            id: w.userId || w.owner?.id,
            firstName: null,
            lastName: null,
            email: '',
            profile: null,
          },
        }))
        setSavedWishlists(transformed)
      }
    } catch (error) {
      console.error('Error obteniendo wishlists guardadas:', error)
      setSavedWishlists([])
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    if (isAuthenticated) {
      fetchSavedWishlists()
    }
  }, [isAuthenticated, fetchSavedWishlists])

  useEffect(() => {
    if (!isAuthenticated) return

    const handleWishlistSaved = () => {
      window.setTimeout(() => {
        fetchSavedWishlists()
      }, 300)
    }

    window.addEventListener('wishlist-saved', handleWishlistSaved)

    return () => {
      window.removeEventListener('wishlist-saved', handleWishlistSaved)
    }
  }, [isAuthenticated, fetchSavedWishlists])

  useEffect(() => {
    if (!isAuthenticated) return

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('saved') === 'true') {
      window.setTimeout(() => {
        fetchSavedWishlists()
      }, 500)
    }
  }, [isAuthenticated, fetchSavedWishlists])

  useEffect(() => {
    if (!isAuthenticated) return

    const handleAccessApproved = () => {
      window.setTimeout(() => {
        fetchSavedWishlists()
      }, 500)
    }

    window.addEventListener('wishlist-access-approved', handleAccessApproved)

    return () => {
      window.removeEventListener('wishlist-access-approved', handleAccessApproved)
    }
  }, [isAuthenticated, fetchSavedWishlists])

  /** Al cambiar de persona seleccionada, colapsar acordeón */
  useEffect(() => {
    resetExpandList()
  }, [selectedUserId, resetExpandList])

  /** Si ya no quedan wishlists del usuario seleccionado, quitar selección */
  useEffect(() => {
    const ids = new Set(savedWishlists.map((w) => w.userId))
    if (selectedUserId !== null && !ids.has(selectedUserId)) {
      setSelectedUserId(null)
    }
  }, [savedWishlists, selectedUserId])

  const handleUnsaveConfirm = async (wishlistId: string) => {
    try {
      await apiClient.delete(API_ENDPOINTS.WISHLISTS.UNSAVE(wishlistId))
      setSavedWishlists((prev) => prev.filter((w) => w.id !== wishlistId))
      setConfirmingUnsave(null)
      setMobileActionsWishlistId(null)
    } catch (error) {
      console.error('Error dejando de ver wishlist:', error)
      alert('Error al desguardar la wishlist')
      setConfirmingUnsave(null)
    }
  }

  const mobileMenuWishlist =
    mobileActionsWishlistId != null
      ? (savedWishlists.find((w) => w.id === mobileActionsWishlistId) ?? null)
      : null

  const wishlistsByUser = savedWishlists.reduce((acc, wishlist) => {
    const uid = wishlist.userId
    if (!acc[uid]) {
      acc[uid] = { user: wishlist.user, wishlists: [] as SavedWishlist[] }
    }
    acc[uid].wishlists.push(wishlist)
    return acc
  }, {} as Record<string, { user: SavedWishlist['user']; wishlists: SavedWishlist[] }>)

  const selectedBundle =
    selectedUserId != null ? (wishlistsByUser[selectedUserId] ?? null) : null
  const selectedOwnerName = selectedBundle
    ? `${selectedBundle.user.firstName || ''} ${selectedBundle.user.lastName || ''}`.trim() || 'este usuario'
    : ''

  if (isLoading) {
    return <div className="py-8 text-center text-gray-400">Cargando wishlists guardadas...</div>
  }

  if (savedWishlists.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">
        <p>No tienes wishlists guardadas de amigos</p>
        <p className="mt-2 text-sm">Las wishlists públicas de tus amigos aparecerán aquí cuando las guardes</p>
      </div>
    )
  }

  return (
      <div className="py-6">
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-[#66DEDB]">Wishlists Guardadas</h2>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="min-w-0 flex-1 text-sm text-gray-400">
              Haz click para ver las wishlists guardadas
            </p>
            <Link
              href="/wishlist"
              scroll={false}
              className="shrink-0 text-sm font-medium text-[#73FFA2] transition-colors hover:text-[#66DEDB]"
            >
              ← Mis wishlists
            </Link>
          </div>
        </div>

      <div className="mb-8 flex flex-wrap gap-4">
        {Object.entries(wishlistsByUser).map(([uid, userData]) => {
          if (!userData?.user) return null
          const isSelected = selectedUserId === uid
          return (
            <UserAvatarWithHexagon
              key={uid}
              userData={userData}
              isSelected={isSelected}
              onSelect={() => setSelectedUserId(isSelected ? null : uid)}
            />
          )
        })}
      </div>

      {selectedBundle ? (
        <div className="space-y-8">
          <h3 className="text-lg font-semibold text-white">Wishlists de {selectedOwnerName}</h3>
          <div className="space-y-4">
            {selectedBundle.wishlists.map((wishlist) => {
              const expanded = expandedWishlistId === wishlist.id
              const productsMounted = mountedProductWishlistId === wishlist.id
              const gridRowsOpen =
                mountedProductWishlistId === wishlist.id && expandedWishlistId === wishlist.id

              return (
                <WishlistAccordionCard
                  key={wishlist.id}
                  wishlist={wishlist}
                  expanded={expanded}
                  gridRowsOpen={gridRowsOpen}
                  productsMounted={productsMounted}
                  onToggleExpand={() => toggleWishlistExpanded(wishlist.id)}
                  desktopPills={
                    <button
                      type="button"
                      className={quitarWishlistDesktopCls}
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmingUnsave(wishlist.id)
                      }}
                    >
                      Quitar wishlist
                    </button>
                  }
                  mobileEllipsisButton={
                    <WishlistAccordionEllipsisButton
                      aria-expanded={mobileActionsWishlistId === wishlist.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setMobileActionsWishlistId((prev) =>
                          prev === wishlist.id ? null : wishlist.id,
                        )
                      }}
                    />
                  }
                  inlineProductsSlot={
                    <WishlistInlineProducts
                      wishlist={wishlist}
                      onRemoveItem={noopRemoveFromList}
                      hideRemoveButton
                      hideCartButton
                    />
                  }
                />
              )
            })}
          </div>
        </div>
      ) : null}

      {mobileMenuWishlist != null ? (
        <div
          className="fixed inset-0 z-[101] flex items-center justify-center bg-transparent p-4"
          role="presentation"
          onClick={() => setMobileActionsWishlistId(null)}
        >
          <div
            role="dialog"
            aria-labelledby="saved-wishlist-mobile-actions-title"
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#66DEDB]/25 bg-[#1a1d24] shadow-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/10 px-4 py-3 sm:px-5">
              <h2 id="saved-wishlist-mobile-actions-title" className="text-lg font-semibold text-white">
                Opciones
              </h2>
              <p className="mt-0.5 truncate text-sm text-zinc-400" title={mobileMenuWishlist.name}>
                {mobileMenuWishlist.name}
              </p>
            </div>
            <div className="flex flex-col p-2">
              <button
                type="button"
                className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                onClick={() => {
                  const id = mobileMenuWishlist.id
                  setMobileActionsWishlistId(null)
                  setConfirmingUnsave(id)
                }}
              >
                Quitar wishlist
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmingUnsave != null ? (
        <div
          className="fixed inset-0 z-[105] flex items-center justify-center bg-transparent p-4"
          role="presentation"
          onClick={() => setConfirmingUnsave(null)}
        >
          <div
            role="alertdialog"
            aria-labelledby="saved-wishlist-unsave-title"
            className="w-full max-w-sm rounded-2xl border border-[#66DEDB]/25 bg-[#1a1d24] px-5 py-5 shadow-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="saved-wishlist-unsave-title" className="mb-3 text-lg font-semibold text-white">
              ¿Quitar esta wishlist?
            </h3>
            <p className="mb-6 text-sm text-zinc-400">
              Seguirás pudiendo verla desde el perfil de su dueño/a si es pública.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmingUnsave(null)}
                className="flex-1 rounded-xl border border-white/12 bg-transparent py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.05]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmingUnsave && void handleUnsaveConfirm(confirmingUnsave)}
                className="flex-1 rounded-xl border border-red-500/50 bg-red-500/15 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/25"
              >
                Quitar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
