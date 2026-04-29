'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { apiClient } from '@/lib/api/client'
import { useToast } from '@/lib/contexts/toast-context'
import { ShareWishlistModal } from '@/components/wishlists/share-wishlist-modal'
import { BookmarkIcon } from '@heroicons/react/24/outline'
import { useWishlistExpandList } from '@/lib/hooks/use-wishlist-expand-list'
import {
  WishlistAccordionCard,
  WishlistAccordionEllipsisButton,
} from '@/components/wishlists/wishlist-accordion-card'
import { WishlistInlineProducts } from '@/components/wishlists/wishlist-inline-products'
import type { WishListDTO } from '@/types/api'

interface UserWishlistsTabProps {
  userId: string
  canViewPrivate: boolean
}

const actionPillCls =
  'inline-flex shrink-0 items-center justify-center rounded-xl border border-[#66DEDB]/40 bg-black/35 px-3 py-2 text-[11px] font-medium text-[#66DEDB] transition-colors hover:border-[#73FFA2]/55 hover:bg-[#66DEDB]/10 sm:text-xs'

export function UserWishlistsTab({ userId, canViewPrivate }: UserWishlistsTabProps) {
  const { user: currentUser } = useAuthStore()
  const { error: showError } = useToast()
  const [wishlists, setWishlists] = useState<WishListDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [shareWishlist, setShareWishlist] = useState<WishListDTO | null>(null)
  const [savedWishlistIds, setSavedWishlistIds] = useState<Set<string>>(new Set())
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set())
  const [backendCanViewPrivate, setBackendCanViewPrivate] = useState(false)
  const [mobileActionsWishlistId, setMobileActionsWishlistId] = useState<string | null>(null)
  const loadingRef = useRef(false)
  const isOwnWishlistViewer = currentUser?.id === userId

  const { expandedWishlistId, mountedProductWishlistId, toggleWishlistExpanded } = useWishlistExpandList()

  // Función para cargar wishlists (extraída para poder reutilizarla)
  const loadWishlists = useCallback(async () => {
    if (!userId || loadingRef.current) return
    loadingRef.current = true
    setIsLoading(true)
    try {
      const response = await apiClient.get<{
        wishlists: WishListDTO[]
        canViewPrivate: boolean
        pendingRequestIds?: string[]
      }>(API_ENDPOINTS.WISHLISTS.BY_USER(userId))
      if (response.success && response.data) {
        console.log('🔍 [WISHLISTS] Wishlists cargadas:', response.data.wishlists?.length, 'canViewPrivate:', response.data.canViewPrivate, 'canViewPrivate prop:', canViewPrivate)
        console.log('🔍 [WISHLISTS] Detalle:', response.data.wishlists?.map(w => ({ 
          name: w.name, 
          public: w.public, 
          itemsCount: w.items?.length || 0,
          isPrivate: !w.public,
          hasItems: (w.items?.length || 0) > 0
        })))
        setWishlists(response.data.wishlists || [])
        setBackendCanViewPrivate(response.data.canViewPrivate) // Usar el valor del backend
        if (response.data.pendingRequestIds) {
          console.log('🔍 [WISHLISTS] Solicitudes pendientes:', response.data.pendingRequestIds)
          setPendingRequestIds(new Set(response.data.pendingRequestIds))
        } else {
          setPendingRequestIds(new Set())
        }
      }
    } catch (error) {
      console.error('Error cargando wishlists:', error)
      setWishlists([])
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [userId])

  // Cargar wishlists del usuario
  useEffect(() => {
    loadWishlists()
  }, [loadWishlists])

  // Escuchar evento cuando se aprueba acceso desde otro lugar (on-demand)
  useEffect(() => {
    if (!currentUser?.id || userId === currentUser.id) return

    const handleAccessApproved = (event: Event) => {
      // Refrescar wishlists cuando se aprueba acceso para mostrar la wishlist con acceso
      const customEvent = event as CustomEvent
      console.log('🔍 [ACCESS APPROVED EVENT] Recibido, refrescando wishlists on-demand...', customEvent.detail)
      // Forzar recarga después de un pequeño delay para asegurar que el backend haya procesado
      setTimeout(() => {
        console.log('🔍 [ACCESS APPROVED EVENT] Ejecutando recarga de wishlists...')
        loadWishlists().then(() => {
          console.log('🔍 [ACCESS APPROVED EVENT] Wishlists recargadas, verificando items...')
        })
      }, 300)
    }

    window.addEventListener('wishlist-access-approved', handleAccessApproved)

    return () => {
      window.removeEventListener('wishlist-access-approved', handleAccessApproved)
    }
  }, [currentUser?.id, userId, loadWishlists])

  // Detectar acceso aprobado y limpiar pendingRequestIds (on-demand cuando cambian las wishlists)
  useEffect(() => {
    if (!currentUser?.id || userId === currentUser.id) return

    // Verificar si alguna wishlist tiene acceso aprobado (privada con items pero sin ser amigo)
    const approvedWishlistIds = wishlists
      .filter(
        (w) =>
          !w.public &&
          currentUser.id !== userId &&
          Array.isArray(w.items) &&
          w.items.length > 0 &&
          !backendCanViewPrivate &&
          !isOwnWishlistViewer,
      )
      .map(w => w.id)

    // Solo log si hay wishlists con acceso aprobado
    if (approvedWishlistIds.length > 0) {
      console.log('🔍 [ACCESS DETECTION] Wishlists con acceso aprobado:', approvedWishlistIds)
    }

    // Si hay wishlists con acceso aprobado que están en pendingRequestIds, limpiarlas
    if (approvedWishlistIds.length > 0) {
      setPendingRequestIds((prev) => {
        const newSet = new Set(prev)
        let changed = false
        approvedWishlistIds.forEach(id => {
          if (newSet.has(id)) {
            newSet.delete(id)
            changed = true
            console.log('🔍 [ACCESS APPROVED DETECTED] Wishlist con ID:', id, 'tiene acceso aprobado, removiendo de pending')
          }
        })
        if (changed) {
          console.log('🔍 [ACCESS APPROVED] Nuevo estado pendingRequestIds:', Array.from(newSet))
        }
        return changed ? newSet : prev
      })
    }
  }, [wishlists, currentUser?.id, userId, backendCanViewPrivate])

  // Cargar wishlists guardadas del usuario actual
  useEffect(() => {
    const loadSavedWishlists = async () => {
      if (!currentUser?.id) return
      try {
        const response = await apiClient.get<WishListDTO[]>(API_ENDPOINTS.WISHLISTS.SAVED)
        if (response.success && response.data) {
          const savedIds = new Set(response.data.map((w) => w.id))
          setSavedWishlistIds(savedIds)
        }
      } catch (error) {
        console.error('Error cargando wishlists guardadas:', error)
      }
    }
    if (currentUser?.id && userId !== currentUser.id) {
      loadSavedWishlists()
    }
  }, [currentUser?.id, userId])

  const handleSaveWishlist = async (wishlistId: string) => {
    if (!currentUser?.id) return
    try {
      const response = await apiClient.post(API_ENDPOINTS.WISHLISTS.SAVE(wishlistId))
      if (response.success) {
        setSavedWishlistIds((prev) => new Set([...prev, wishlistId]))

        // Disparar evento para refrescar wishlists guardadas si están en la página
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wishlist-saved'))
        }
        await loadWishlists()
      }
    } catch (error) {
      console.error('Error guardando wishlist:', error)
      alert('Error al guardar la wishlist')
    }
  }

  const handleUnsaveWishlist = async (wishlistId: string) => {
    if (!currentUser?.id) return
    try {
      await apiClient.delete(API_ENDPOINTS.WISHLISTS.UNSAVE(wishlistId))
      setSavedWishlistIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(wishlistId)
        return newSet
      })
      await loadWishlists()
    } catch (error) {
      console.error('Error desguardando wishlist:', error)
      alert('Error al desguardar la wishlist')
    }
  }

  const handleRequestAccess = async (wishlistId: string) => {
    if (!currentUser?.id) return
    try {
      const response = await apiClient.post(API_ENDPOINTS.WISHLISTS.REQUEST_ACCESS(wishlistId))
      if (response.success) {
        setPendingRequestIds((prev) => {
          const newSet = new Set([...prev, wishlistId])
          console.log('🔍 [REQUEST ACCESS] Estado actualizado localmente, pendingRequestIds:', Array.from(newSet))
          return newSet
        })
        alert('Solicitud de acceso enviada')
        await loadWishlists()
      }
    } catch (error: any) {
      console.error('Error solicitando acceso:', error)
      const errorMessage = error.response?.data?.error?.message || 'Error al solicitar acceso'
      alert(errorMessage)
    }
  }

  const handleCancelAccessRequest = async (wishlistId: string) => {
    if (!currentUser?.id) return
    try {
      const response = await apiClient.delete(API_ENDPOINTS.WISHLISTS.CANCEL_ACCESS_REQUEST(wishlistId))
      if (response.success) {
        // Actualizar estado local inmediatamente (on-demand)
        setPendingRequestIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(wishlistId)
          console.log('🔍 [CANCEL REQUEST] Estado actualizado localmente, pendingRequestIds:', Array.from(newSet))
          return newSet
        })
        alert('Solicitud cancelada')
        await loadWishlists()
      }
    } catch (error: any) {
      console.error('Error cancelando solicitud:', error)
      const errorMessage = error.response?.data?.error?.message || 'Error al cancelar la solicitud'
      alert(errorMessage)
    }
  }

  const noopRemove = async (_wid: string, _iid: string) => {}

  const getWishlistUiState = (w: WishListDTO) => {
    const itemsArray = Array.isArray(w.items) ? w.items : []
    const guestSeesPrivateContent =
      !w.public && !isOwnWishlistViewer && itemsArray.length > 0
    const viewerPrivateLocked = !isOwnWishlistViewer && !w.public && itemsArray.length === 0
    const canView = w.public || guestSeesPrivateContent || isOwnWishlistViewer
    const hasPendingRequest = guestSeesPrivateContent ? false : pendingRequestIds.has(w.id)
    const saved = savedWishlistIds.has(w.id)
    const mayBookmark = !isOwnWishlistViewer && (w.public || guestSeesPrivateContent)
    return { canView, hasPendingRequest, saved, viewerPrivateLocked, mayBookmark, guestSeesPrivateContent }
  }

  const removeWishlistItem = useCallback(
    async (wishListId: string, itemId: string) => {
      if (!isOwnWishlistViewer || !currentUser?.id) return
      try {
        const response = await apiClient.delete(API_ENDPOINTS.WISHLISTS.REMOVE_ITEM(wishListId, itemId))
        if (!response.success) {
          showError('No se pudo quitar el producto')
          return
        }
        setWishlists((prev) =>
          prev.map((list) =>
            list.id === wishListId
              ? { ...list, items: list.items.filter((i) => i.id !== itemId) }
              : list,
          ),
        )
      } catch (e) {
        console.error(e)
        showError('Error al quitar el producto')
      }
    },
    [isOwnWishlistViewer, currentUser?.id, showError],
  )

  const mobileMenuWishlist =
    mobileActionsWishlistId != null
      ? (wishlists.find((w) => w.id === mobileActionsWishlistId) ?? null)
      : null

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
        <p className="text-gray-400">Cargando wishlists...</p>
      </div>
    )
  }

  if (wishlists.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No hay wishlists aún</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {wishlists.map((wishlist) => {
        const isPrivate = !wishlist.public
        const isSaved = savedWishlistIds.has(wishlist.id)
        const itemsArray = Array.isArray(wishlist.items) ? wishlist.items : []

        const guestSeesPrivateContent =
          isPrivate && !isOwnWishlistViewer && itemsArray.length > 0
        const viewerPrivateLocked = !isOwnWishlistViewer && isPrivate && itemsArray.length === 0
        const canView = !isPrivate || guestSeesPrivateContent || isOwnWishlistViewer
        const hasPendingRequest = guestSeesPrivateContent ? false : pendingRequestIds.has(wishlist.id)
        const mayBookmark =
          Boolean(currentUser?.id) && !isOwnWishlistViewer && (!isPrivate || guestSeesPrivateContent)

        const expanded = expandedWishlistId === wishlist.id
        const productsMounted = mountedProductWishlistId === wishlist.id
        const gridRowsOpen = mountedProductWishlistId === wishlist.id && expandedWishlistId === wishlist.id

        const displayWishlist = viewerPrivateLocked ? { ...wishlist, items: [] as typeof wishlist.items } : wishlist

        const desktopPills =
          isOwnWishlistViewer ? (
            <button
              type="button"
              className={actionPillCls}
              onClick={(e) => {
                e.stopPropagation()
                setShareWishlist(wishlist)
              }}
            >
              Compartir
            </button>
          ) : currentUser?.id && viewerPrivateLocked ? (
            hasPendingRequest ? (
              <button
                type="button"
                className={actionPillCls}
                onClick={(e) => {
                  e.stopPropagation()
                  void handleCancelAccessRequest(wishlist.id)
                }}
              >
                Cancelar solicitud
              </button>
            ) : (
              <button
                type="button"
                className="rounded-xl border border-[#73FFA2]/45 bg-black/35 px-3 py-2 text-[11px] font-semibold text-[#73FFA2] shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)] transition-colors hover:border-[#73FFA2]/65 hover:bg-[#73FFA2]/10 sm:text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleRequestAccess(wishlist.id)
                }}
              >
                Solicitar acceso
              </button>
            )
          ) : currentUser?.id && mayBookmark ? (
            isSaved ? (
              <button
                type="button"
                className={actionPillCls}
                onClick={(e) => {
                  e.stopPropagation()
                  void handleUnsaveWishlist(wishlist.id)
                }}
              >
                Guardada
              </button>
            ) : (
              <button
                type="button"
                className={`${actionPillCls} gap-1`}
                onClick={(e) => {
                  e.stopPropagation()
                  void handleSaveWishlist(wishlist.id)
                }}
              >
                <BookmarkIcon className="h-3.5 w-3.5" aria-hidden />
                Guardar
              </button>
            )
          ) : null

        const showMobileMenu = isOwnWishlistViewer || (!isOwnWishlistViewer && Boolean(currentUser?.id) && mayBookmark)

        const mobileEllipsisButton = showMobileMenu ? (
          <WishlistAccordionEllipsisButton
            aria-expanded={mobileActionsWishlistId === wishlist.id}
            onClick={(e) => {
              e.stopPropagation()
              setMobileActionsWishlistId((prev) => (prev === wishlist.id ? null : wishlist.id))
            }}
          />
        ) : null

        const inlineProductsSlot = canView ? (
            <WishlistInlineProducts
              wishlist={wishlist}
              onRemoveItem={isOwnWishlistViewer ? removeWishlistItem : noopRemove}
              hideRemoveButton={!isOwnWishlistViewer}
            />
          ) : (
            <div className="px-3 py-8 text-center text-sm text-zinc-500 sm:px-4">
              Esta wishlist es privada. Solicita acceso para ver los productos.
            </div>
          )

        return (
          <WishlistAccordionCard
            key={wishlist.id}
            wishlist={displayWishlist}
            expanded={viewerPrivateLocked ? false : expanded}
            gridRowsOpen={viewerPrivateLocked ? false : gridRowsOpen}
            productsMounted={viewerPrivateLocked ? false : productsMounted}
            onToggleExpand={() => {
              if (viewerPrivateLocked) return
              toggleWishlistExpanded(wishlist.id)
            }}
            desktopPills={desktopPills}
            mobileEllipsisButton={mobileEllipsisButton}
            inlineProductsSlot={inlineProductsSlot}
            privateLockedVisitor={viewerPrivateLocked}
          />
        )
      })}

      {mobileMenuWishlist && currentUser?.id ? (
        <div
          className="fixed inset-0 z-[101] flex items-center justify-center bg-transparent p-4"
          role="presentation"
          onClick={() => setMobileActionsWishlistId(null)}
        >
          <div
            role="dialog"
            aria-labelledby="profile-wishlist-mobile-actions-title"
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#66DEDB]/25 bg-[#1a1d24] shadow-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/10 px-4 py-3 sm:px-5">
              <h2 id="profile-wishlist-mobile-actions-title" className="text-lg font-semibold text-white">
                Opciones
              </h2>
              <p className="mt-0.5 truncate text-sm text-zinc-400" title={mobileMenuWishlist.name}>
                {mobileMenuWishlist.name}
              </p>
            </div>
            <div className="flex flex-col p-2">
              {(() => {
                const w = mobileMenuWishlist
                const st = getWishlistUiState(w)
                if (isOwnWishlistViewer) {
                  return (
                    <button
                      type="button"
                      className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#66DEDB] transition-colors hover:bg-white/10"
                      onClick={() => {
                        setMobileActionsWishlistId(null)
                        setShareWishlist(w)
                      }}
                    >
                      Compartir
                    </button>
                  )
                }
                if (!isOwnWishlistViewer) {
                  if (!w.public && !st.canView) {
                    return st.hasPendingRequest ? (
                      <button
                        type="button"
                        className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#66DEDB] transition-colors hover:bg-white/10"
                        onClick={() => {
                          setMobileActionsWishlistId(null)
                          void handleCancelAccessRequest(w.id)
                        }}
                      >
                        Cancelar solicitud
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#66DEDB] transition-colors hover:bg-white/10"
                        onClick={() => {
                          setMobileActionsWishlistId(null)
                          void handleRequestAccess(w.id)
                        }}
                      >
                        Solicitar acceso
                      </button>
                    )
                  }
                  if (st.mayBookmark) {
                    return st.saved ? (
                      <button
                        type="button"
                        className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#66DEDB] transition-colors hover:bg-white/10"
                        onClick={() => {
                          setMobileActionsWishlistId(null)
                          void handleUnsaveWishlist(w.id)
                        }}
                      >
                        Quitar de guardadas
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#66DEDB] transition-colors hover:bg-white/10"
                        onClick={() => {
                          setMobileActionsWishlistId(null)
                          void handleSaveWishlist(w.id)
                        }}
                      >
                        Guardar wishlist
                      </button>
                    )
                  }
                }
                return null
              })()}
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal para compartir wishlist */}
      {shareWishlist && (
        <ShareWishlistModal
          wishlist={shareWishlist}
          isOpen={!!shareWishlist}
          onClose={() => setShareWishlist(null)}
        />
      )}

    </div>
  )
}

