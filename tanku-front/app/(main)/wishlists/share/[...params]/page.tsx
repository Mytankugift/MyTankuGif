'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { apiClient } from '@/lib/api/client'
import { WishlistProductsModal } from '@/components/wishlists/wishlist-products-modal'
import Image from 'next/image'
import { ArrowLeftIcon, BookmarkIcon } from '@heroicons/react/24/outline'
import type { WishListDTO } from '@/types/api'

export default function SharedWishlistPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  
  // Manejar tanto [token] como [username]/[slug]
  const paramsArray = params.params as string[]
  const tokenOrPath = paramsArray ? paramsArray.join('/') : ''

  const [wishlist, setWishlist] = useState<WishListDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [selectedWishlist, setSelectedWishlist] = useState<WishListDTO | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadWishlist = async () => {
      if (!tokenOrPath) return
      setIsLoading(true)
      setError(null)
      try {
        const response = await apiClient.get<WishListDTO>(
          API_ENDPOINTS.WISHLISTS.BY_SHARE_TOKEN(tokenOrPath)
        )
        if (response.success && response.data) {
          setWishlist(response.data)
        } else {
          setError('Wishlist no encontrada')
        }
      } catch (error: any) {
        console.error('Error cargando wishlist:', error)
        setError('Wishlist no encontrada o enlace inválido')
      } finally {
        setIsLoading(false)
      }
    }
    loadWishlist()
  }, [tokenOrPath])

  const handleAcceptWishlist = async () => {
    if (!isAuthenticated || !user?.id || !wishlist) {
      // Redirigir a login
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname))
      return
    }

    setIsSaving(true)
    try {
      const response = await apiClient.post(API_ENDPOINTS.WISHLISTS.SAVE(wishlist.id))
      
      if (response.success) {
        setIsSaved(true)
        
        // Disparar evento para refrescar wishlists guardadas si están en la página
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wishlist-saved'))
        }
        
        // Esperar un momento antes de redirigir para que el evento se procese
        setTimeout(() => {
          router.push('/wishlist?saved=true')
        }, 100)
      }
    } catch (error: any) {
      console.error('Error aceptando wishlist:', error)
      if (error.response?.status === 409) {
        setIsSaved(true)
        alert('Ya tienes esta wishlist guardada')
      } else {
        alert('Error al aceptar la wishlist')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando wishlist...</p>
        </div>
      </div>
    )
  }

  if (error || !wishlist) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-gray-400 text-xl mb-4">{error || 'Wishlist no encontrada'}</p>
          <p className="text-gray-500 text-sm mb-6">
            El enlace puede haber expirado o la wishlist puede haber sido eliminada.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[#73FFA2] text-gray-900 rounded-lg hover:bg-[#66DEDB] transition-colors"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold flex-1">{wishlist.name}</h1>
            {isAuthenticated && (
              <button
                onClick={handleAcceptWishlist}
                disabled={isSaving || isSaved}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  isSaved
                    ? 'bg-[#73FFA2] text-gray-900'
                    : 'bg-[#73FFA2] text-gray-900 hover:bg-[#66DEDB]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <BookmarkIcon className="w-5 h-5" />
                {isSaving ? 'Aceptando...' : isSaved ? 'Aceptada' : 'Aceptar Wishlist'}
              </button>
            )}
            {!isAuthenticated && (
              <button
                onClick={() => router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname))}
                className="px-4 py-2 bg-[#73FFA2] text-gray-900 rounded-lg hover:bg-[#66DEDB] transition-colors font-semibold"
              >
                Iniciar sesión para aceptar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <p className="text-gray-400 text-sm">
            {wishlist.items.length} producto{wishlist.items.length !== 1 ? 's' : ''}
            {wishlist.public && <span className="ml-2">🌐 Pública</span>}
          </p>
        </div>

        {wishlist.items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Esta wishlist está vacía</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {wishlist.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedWishlist(wishlist)}
                className="group relative aspect-square rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-[#73FFA2] transition-all"
              >
                {item.product.thumbnail ? (
                  <Image
                    src={item.product.thumbnail}
                    alt={item.product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    Sin imagen
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-xs font-medium line-clamp-2">
                      {item.product.title}
                    </p>
                    {item.variant && item.variant.tankuPrice && (
                      <p className="text-[#73FFA2] text-xs mt-1">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(item.variant.tankuPrice)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => setSelectedWishlist(wishlist)}
            className="px-6 py-3 bg-[#73FFA2] text-gray-900 font-semibold rounded-lg hover:bg-[#66DEDB] transition-colors"
          >
            Ver todos los productos
          </button>
        </div>
      </div>

      {/* Modal de productos */}
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

