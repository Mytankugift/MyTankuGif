/**
 * Componente para ver wishlists guardadas de amigos con avatares hexagonales
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { WishlistProductsModal } from './wishlist-products-modal'
import type { WishListDTO } from '@/types/api'

interface UserAvatarWithHexagonProps {
  userId: string
  userData: { user: SavedWishlist['user']; wishlists: SavedWishlist[] }
  isSelected: boolean
  onSelect: () => void
}

function UserAvatarWithHexagon({ userId, userData, isSelected, onSelect }: UserAvatarWithHexagonProps) {
  const fullName = `${userData.user.firstName || ''} ${userData.user.lastName || ''}`.trim() || 'Sin nombre'
  const avatarUrl =
    userData.user.profile?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1E1E1E&color=73FFA2&size=64`
  const [imgSrc, setImgSrc] = useState<string>(avatarUrl)

  return (
    <div
      key={userId}
      className="relative cursor-pointer group"
      onClick={onSelect}
    >
      {/* Avatar circular */}
      <div
        className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all duration-300 ${
          isSelected
            ? 'border-[#73FFA2] scale-110'
            : 'border-gray-700 hover:border-[#73FFA2]/50'
        }`}
      >
        <Image
          src={imgSrc}
          alt={fullName}
          fill
          className="object-cover"
          onError={() =>
            setImgSrc(
              `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1E1E1E&color=73FFA2&size=64`
            )
          }
          referrerPolicy="no-referrer"
          unoptimized
        />
      </div>

      {/* Hexágono cuando está seleccionado - con lados laterales más largos */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none">
          <svg
            width="88"
            height="80"
            viewBox="0 0 88 80"
            className="absolute -top-4 -left-4"
            style={{ filter: 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.5))' }}
          >
            {/* Hexágono con lados laterales más largos */}
            <polygon
              points="44,4 76,18 84,40 76,62 44,76 12,62 4,40 12,18"
              fill="none"
              stroke="#73FFA2"
              strokeWidth="2.5"
              className="animate-pulse"
            />
          </svg>
        </div>
      )}

      {/* Tooltip con nombre */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="bg-gray-900 border border-[#73FFA2]/50 rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap">
          {fullName}
        </div>
      </div>
    </div>
  )
}

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

export function SavedWishlistsViewer() {
  const { isAuthenticated, user } = useAuthStore()
  const [savedWishlists, setSavedWishlists] = useState<SavedWishlist[]>([])
  const [selectedWishlist, setSelectedWishlist] = useState<SavedWishlist | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchSavedWishlists()
    }
  }, [isAuthenticated])

  const fetchSavedWishlists = async () => {
    if (!isAuthenticated || !user?.id) return

    setIsLoading(true)
    try {
      // TODO: Implementar endpoint para obtener wishlists guardadas
      // Por ahora usamos un placeholder
      // const response = await apiClient.get<SavedWishlist[]>(API_ENDPOINTS.WISHLISTS.SAVED)
      // if (response.success && response.data) {
      //   setSavedWishlists(response.data)
      // }
      
      // Placeholder - por ahora mostrar mensaje
      setSavedWishlists([])
    } catch (error) {
      console.error('Error obteniendo wishlists guardadas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnsave = async (wishlistId: string) => {
    if (!confirm('¿Dejar de ver esta wishlist?')) return

    try {
      // TODO: Implementar endpoint para dejar de guardar wishlist
      // await apiClient.delete(API_ENDPOINTS.WISHLISTS.UNSAVE(wishlistId))
      setSavedWishlists((prev) => prev.filter((w) => w.id !== wishlistId))
    } catch (error) {
      console.error('Error dejando de ver wishlist:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center text-gray-400">
        Cargando wishlists guardadas...
      </div>
    )
  }

  // Agrupar wishlists por usuario
  const wishlistsByUser = savedWishlists.reduce((acc, wishlist) => {
    if (!acc[wishlist.userId]) {
      acc[wishlist.userId] = {
        user: wishlist.user,
        wishlists: [],
      }
    }
    acc[wishlist.userId].wishlists.push(wishlist)
    return acc
  }, {} as Record<string, { user: SavedWishlist['user']; wishlists: SavedWishlist[] }>)

  if (savedWishlists.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No tienes wishlists guardadas de amigos</p>
        <p className="text-sm mt-2">
          Las wishlists públicas de tus amigos aparecerán aquí cuando las guardes
        </p>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#66DEDB] mb-2">Wishlists Guardadas</h2>
        <p className="text-gray-400 text-sm">
          Click en un amigo para ver sus wishlists guardadas
        </p>
      </div>

      {/* Lista de usuarios con avatares */}
      <div className="flex flex-wrap gap-4 mb-8">
        {Object.entries(wishlistsByUser).map(([userId, userData]) => {
          const isSelected = selectedUserId === userId
          const fullName = `${userData.user.firstName || ''} ${userData.user.lastName || ''}`.trim() || 'Sin nombre'
          const avatarUrl =
            userData.user.profile?.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1E1E1E&color=73FFA2&size=64`
          
          return (
            <UserAvatarWithHexagon
              key={userId}
              userId={userId}
              userData={userData}
              isSelected={isSelected}
              onSelect={() => setSelectedUserId(isSelected ? null : userId)}
            />
          )
        })}
      </div>

      {/* Lista de wishlists del usuario seleccionado */}
      {selectedUserId && wishlistsByUser[selectedUserId] && (

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Wishlists de {wishlistsByUser[selectedUserId].user.firstName || 'este usuario'}
          </h3>
          {wishlistsByUser[selectedUserId].wishlists.map((wishlist) => (
            <div
              key={wishlist.id}
              className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-[#73FFA2]/30 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-white font-semibold">{wishlist.name}</h4>
                  {wishlist.public && (
                    <span className="text-xs text-[#73FFA2]">🌐 Pública</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    {wishlist.items.length} producto{wishlist.items.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => handleUnsave(wishlist.id)}
                    className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                    title="Dejar de ver"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Previsualización de productos (máximo 4) */}
              {wishlist.items.length > 0 && (
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
              )}

              <button
                onClick={() => setSelectedWishlist(wishlist)}
                className="w-full py-2 px-4 text-sm bg-[#73FFA2] text-gray-900 font-semibold rounded-lg hover:bg-[#66DEDB] transition-colors"
              >
                Ver todos los productos
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal para ver todos los productos */}
      {selectedWishlist && (
        <WishlistProductsModal
          wishlist={selectedWishlist}
          isOpen={!!selectedWishlist}
          onClose={() => setSelectedWishlist(null)}
        />
      )}
    </div>
  )
}

