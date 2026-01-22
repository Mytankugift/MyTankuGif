'use client'

import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { apiClient } from '@/lib/api/client'
import { WishlistProductsModal } from '@/components/wishlists/wishlist-products-modal'
import { ShareWishlistModal } from '@/components/wishlists/share-wishlist-modal'
import Image from 'next/image'
import { BookmarkIcon, LockClosedIcon, ShareIcon } from '@heroicons/react/24/outline'
import type { WishListDTO } from '@/types/api'

interface UserWishlistsTabProps {
  userId: string
  canViewPrivate: boolean
}

export function UserWishlistsTab({ userId, canViewPrivate }: UserWishlistsTabProps) {
  const { user: currentUser } = useAuthStore()
  const [wishlists, setWishlists] = useState<WishListDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWishlist, setSelectedWishlist] = useState<WishListDTO | null>(null)
  const [shareWishlist, setShareWishlist] = useState<WishListDTO | null>(null)
  const [savedWishlistIds, setSavedWishlistIds] = useState<Set<string>>(new Set())

  // Cargar wishlists del usuario
  useEffect(() => {
    const loadWishlists = async () => {
      if (!userId) return
      setIsLoading(true)
      try {
        const response = await apiClient.get<{
          wishlists: WishListDTO[]
          canViewPrivate: boolean
        }>(API_ENDPOINTS.WISHLISTS.BY_USER(userId))
        if (response.success && response.data) {
          setWishlists(response.data.wishlists || [])
        }
      } catch (error) {
        console.error('Error cargando wishlists:', error)
        setWishlists([])
      } finally {
        setIsLoading(false)
      }
    }
    loadWishlists()
  }, [userId])

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
    } catch (error) {
      console.error('Error desguardando wishlist:', error)
      alert('Error al desguardar la wishlist')
    }
  }

  const handleRequestAccess = async (wishlistId: string) => {
    // TODO: Implementar solicitud de acceso a wishlist privada
    alert('Funcionalidad de solicitar acceso próximamente')
  }

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
        const canView = !isPrivate || canViewPrivate
        const isOwnWishlist = currentUser?.id === userId

        return (
          <div
            key={wishlist.id}
            className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-[#73FFA2]/30 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white font-semibold">{wishlist.name}</h4>
                  {isPrivate ? (
                    <LockClosedIcon className="w-4 h-4 text-gray-400" title="Privada" />
                  ) : (
                    <span className="text-xs text-[#73FFA2]">🌐 Pública</span>
                  )}
                </div>
                {canView ? (
                  <span className="text-sm text-gray-400">
                    {wishlist.items.length} producto{wishlist.items.length !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500 italic">
                    Wishlist privada - Solicita acceso para ver
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isOwnWishlist && canView && (
                  <>
                    {isSaved ? (
                      <button
                        onClick={() => handleUnsaveWishlist(wishlist.id)}
                        className="px-3 py-1 text-xs bg-[#73FFA2] text-gray-900 rounded hover:bg-[#66DEDB] transition-colors"
                        title="Desguardar wishlist"
                      >
                        Guardada
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSaveWishlist(wishlist.id)}
                        className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors flex items-center gap-1"
                        title="Guardar wishlist"
                      >
                        <BookmarkIcon className="w-3 h-3" />
                        Guardar
                      </button>
                    )}
                  </>
                )}
                {isOwnWishlist && (
                  <button
                    onClick={() => setShareWishlist(wishlist)}
                    className="p-2 hover:bg-gray-700 rounded transition-colors"
                    title="Compartir wishlist"
                  >
                    <ShareIcon className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Previsualización de productos (solo si puede ver) */}
            {canView && wishlist.items.length > 0 && (
              <>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {wishlist.items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="relative aspect-square rounded overflow-hidden bg-gray-700/30"
                    >
                      {item.product.thumbnail && (
                        <Image
                          src={item.product.thumbnail}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedWishlist(wishlist)}
                  className="w-full py-2 px-4 text-sm bg-[#73FFA2] text-gray-900 font-semibold rounded-lg hover:bg-[#66DEDB] transition-colors"
                >
                  Ver todos los productos
                </button>
              </>
            )}

            {/* Botón para solicitar acceso a wishlist privada */}
            {!canView && !isOwnWishlist && (
              <button
                onClick={() => handleRequestAccess(wishlist.id)}
                className="w-full py-2 px-4 text-sm bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 transition-colors"
              >
                Solicitar acceso
              </button>
            )}
          </div>
        )
      })}

      {/* Modal para ver todos los productos */}
      {selectedWishlist && (
        <WishlistProductsModal
          wishlist={selectedWishlist}
          isOpen={!!selectedWishlist}
          onClose={() => setSelectedWishlist(null)}
        />
      )}

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

