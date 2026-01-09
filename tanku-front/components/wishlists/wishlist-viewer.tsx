/**
 * Componente para ver wishlists guardadas con avatares hexagonales
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useWishLists } from '@/lib/hooks/use-wishlists'
import { WishlistProductsModal } from './wishlist-products-modal'
import type { WishListDTO } from '@/types/api'

interface WishlistViewerProps {
  userId?: string // Si se proporciona, muestra wishlists de ese usuario
}

export function WishlistViewer({ userId }: WishlistViewerProps) {
  const { wishLists, fetchWishLists, isLoading } = useWishLists()
  const [selectedWishlist, setSelectedWishlist] = useState<WishListDTO | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchWishLists()
  }, [fetchWishLists])

  if (isLoading) {
    return (
      <div className="py-8 text-center text-gray-400">
        Cargando wishlists...
      </div>
    )
  }

  // Agrupar wishlists por usuario
  const wishlistsByUser = wishLists.reduce((acc, wishlist) => {
    if (!acc[wishlist.userId]) {
      acc[wishlist.userId] = []
    }
    acc[wishlist.userId].push(wishlist)
    return acc
  }, {} as Record<string, WishListDTO[]>)

  return (
    <div className="py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#66DEDB] mb-2">Wishlists Guardadas</h2>
        <p className="text-gray-400 text-sm">
          Click en un usuario para ver sus wishlists
        </p>
      </div>

      {/* Lista de usuarios con avatares */}
      <div className="flex flex-wrap gap-4 mb-8">
        {Object.entries(wishlistsByUser).map(([userId, userWishlists]) => {
          const isSelected = selectedUserId === userId
          const firstWishlist = userWishlists[0]
          // Aquí necesitarías obtener el avatar del usuario, por ahora uso placeholder
          const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userId)}&background=1E1E1E&color=73FFA2&size=64`

          return (
            <div
              key={userId}
              className="relative cursor-pointer group"
              onClick={() => {
                setSelectedUserId(isSelected ? null : userId)
              }}
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
                  src={avatarUrl}
                  alt={`Usuario ${userId}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              {/* Hexágono cuando está seleccionado */}
              {isSelected && (
                <div className="absolute inset-0 pointer-events-none">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 80 80"
                    className="absolute -top-2 -left-2"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.5))' }}
                  >
                    <polygon
                      points="40,5 70,20 70,50 40,65 10,50 10,20"
                      fill="none"
                      stroke="#73FFA2"
                      strokeWidth="2"
                      className="animate-pulse"
                    />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Lista de wishlists del usuario seleccionado */}
      {selectedUserId && wishlistsByUser[selectedUserId] && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Wishlists del usuario</h3>
          {wishlistsByUser[selectedUserId].map((wishlist) => (
            <div
              key={wishlist.id}
              className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-[#73FFA2]/30 transition-all cursor-pointer"
              onClick={() => setSelectedWishlist(wishlist)}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-white font-semibold">{wishlist.name}</h4>
                  {wishlist.public && (
                    <span className="text-xs text-[#73FFA2]">🌐 Pública</span>
                  )}
                </div>
                <span className="text-sm text-gray-400">
                  {wishlist.items.length} producto{wishlist.items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Previsualización de productos (máximo 4) */}
              <div className="grid grid-cols-4 gap-2">
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

              {wishlist.items.length > 4 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedWishlist(wishlist)
                  }}
                  className="mt-2 text-sm text-[#66DEDB] hover:underline"
                >
                  Ver más ({wishlist.items.length - 4} más)
                </button>
              )}
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

