/**
 * Componente para ver wishlists guardadas de amigos con avatares hexagonales
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useToast } from '@/lib/contexts/toast-context'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
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
        className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-700 transition-all duration-300"
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
            width="120"
            height="100"
            viewBox="0 0 120 100"
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
            style={{ filter: 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.5))' }}
          >
            {/* Hexágono con 6 puntos: lados izquierdo y derecho más largos que las puntas de arriba/abajo */}
            {/* Puntos: arriba, arriba-derecha, abajo-derecha, abajo, abajo-izquierda, arriba-izquierda */}
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
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const { addItem } = useCartStore()
  const { cart } = useCartStore()
  const { error: showError } = useToast()
  const [savedWishlists, setSavedWishlists] = useState<SavedWishlist[]>([])
  const [selectedWishlist, setSelectedWishlist] = useState<SavedWishlist | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [confirmingUnsave, setConfirmingUnsave] = useState<string | null>(null)
  const confirmRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const fetchSavedWishlists = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return

    setIsLoading(true)
    try {
      const response = await apiClient.get<any[]>(API_ENDPOINTS.WISHLISTS.SAVED)
      if (response.success && response.data) {
        // Transformar los datos del backend: owner -> user y asegurar userId
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
  
  // Escuchar evento cuando se guarda una wishlist desde otra página
  useEffect(() => {
    if (!isAuthenticated) return
    
    const handleWishlistSaved = () => {
      // Pequeño delay para asegurar que el backend haya procesado el guardado
      setTimeout(() => {
        fetchSavedWishlists()
      }, 300)
    }
    
    window.addEventListener('wishlist-saved', handleWishlistSaved)
    
    return () => {
      window.removeEventListener('wishlist-saved', handleWishlistSaved)
    }
  }, [isAuthenticated, fetchSavedWishlists])
  
  // También refrescar cuando el componente se monta y está en el tab "saved"
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      // Verificar si estamos en la página de wishlists con el tab saved activo
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('saved') === 'true') {
        // Pequeño delay para asegurar que la navegación se complete
        setTimeout(() => {
          fetchSavedWishlists()
        }, 500)
      }
    }
  }, [isAuthenticated, fetchSavedWishlists])

  // Escuchar evento cuando se aprueba acceso a una wishlist
  useEffect(() => {
    if (!isAuthenticated) return
    
    const handleAccessApproved = () => {
      // Refrescar wishlists guardadas cuando se aprueba acceso
      setTimeout(() => {
        fetchSavedWishlists()
      }, 500)
    }
    
    window.addEventListener('wishlist-access-approved', handleAccessApproved)
    
    return () => {
      window.removeEventListener('wishlist-access-approved', handleAccessApproved)
    }
  }, [isAuthenticated, fetchSavedWishlists])

  const handleUnsaveClick = (wishlistId: string) => {
    setConfirmingUnsave(wishlistId)
  }

  const handleUnsaveConfirm = async (e: React.MouseEvent, wishlistId: string) => {
    e.stopPropagation()
    try {
      await apiClient.delete(API_ENDPOINTS.WISHLISTS.UNSAVE(wishlistId))
      setSavedWishlists((prev) => prev.filter((w) => w.id !== wishlistId))
      setConfirmingUnsave(null)
    } catch (error) {
      console.error('Error dejando de ver wishlist:', error)
      alert('Error al desguardar la wishlist')
      setConfirmingUnsave(null)
    }
  }

  const handleUnsaveCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmingUnsave(null)
  }

  // Cerrar globito al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!confirmingUnsave) return
      
      const target = event.target as Node
      const confirmRef = confirmRefs.current.get(confirmingUnsave)
      
      // Verificar que el click no sea dentro del contenedor del globito
      if (confirmRef && !confirmRef.contains(target)) {
        setConfirmingUnsave(null)
      }
    }

    if (confirmingUnsave) {
      // Usar click en lugar de mousedown para que los botones puedan procesar primero
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [confirmingUnsave])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)

  const getDisplayPrice = (item: SavedWishlist['items'][0]) => {
    const finalPrice = item.variant?.tankuPrice || 0
    if (finalPrice > 0) {
      return formatPrice(finalPrice)
    }
    return '—'
  }

  const handleAddToCartFromWishlistItem = async (item: SavedWishlist['items'][0]) => {
    try {
      if (item.variantId) {
        await addItem(item.variantId, 1)
        return
      }

      const handle = item.product.handle
      if (!handle) return
      const fullProduct = await fetchProductByHandle(handle)
      const variants = fullProduct?.variants || []
      if (variants.length === 1) {
        await addItem(variants[0].id, 1)
        return
      }

      setSelectedWishlist((prev) => prev || null)
    } catch (error: any) {
      // Si el error es porque el carrito actual es de regalos
      if (error.message === 'CART_IS_GIFT_CART') {
        alert('Tienes productos en el carrito de regalos. Por favor, ve al carrito y finaliza tu compra de regalos antes de agregar productos a tu carrito normal, o limpia el carrito de regalos.')
        return
      }
      console.error('Error agregando al carrito:', error)
      alert(error.message || 'Error al agregar producto al carrito')
    }
  }

  const handleSendAsGift = async (item: SavedWishlist['items'][0], wishlistOwnerId: string) => {
    if (!item.variantId) {
      alert('Este producto no tiene variante seleccionada')
      return
    }

    // Validar que el usuario esté autenticado
    if (!user?.id) {
      router.push('/feed')
      return
    }

    // Validar stock antes de continuar
    try {
      const variantResponse = await apiClient.get<any>(API_ENDPOINTS.PRODUCTS.VARIANT_BY_ID(item.variantId))
      if (variantResponse.success && variantResponse.data) {
        const stock = variantResponse.data.stock || 0
        if (stock <= 0) {
          showError('Este producto está agotado y no está disponible para regalo')
          return
        }
        if (stock < 1) {
          showError(`Stock insuficiente. Solo hay ${stock} unidad(es) disponible(s)`)
          return
        }
      } else {
        showError('No se pudo verificar el stock del producto')
        return
      }
    } catch (error: any) {
      showError(error.message || 'Error verificando disponibilidad del producto')
      return
    }

    // Validar destinatario antes de continuar
    try {
      const eligibility = await apiClient.get<any>(API_ENDPOINTS.GIFTS.RECIPIENT_ELIGIBILITY(wishlistOwnerId))
      if (!eligibility.success || !eligibility.data?.canReceive) {
        showError(eligibility.data?.reason || 'Este usuario no puede recibir regalos')
        return
      }
      if (eligibility.data?.canSendGift === false) {
        showError(eligibility.data?.sendGiftReason || 'No puedes enviar regalos a este usuario')
        return
      }
    } catch (error: any) {
      showError(error.message || 'Error validando destinatario')
      return
    }

    // ✅ NUEVO: Ir directamente al checkout de regalo sin carrito
    router.push(`/checkout/gift-direct?variantId=${item.variantId}&recipientId=${wishlistOwnerId}&quantity=1`)
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
          Haz click para ver las wishlists guardadas
        </p>
      </div>

      {/* Lista de usuarios con avatares */}
      <div className="flex flex-wrap gap-4 mb-8">
        {Object.entries(wishlistsByUser).map(([userId, userData]) => {
          // Validar que userData.user existe
          if (!userData?.user) {
            console.warn('User data missing for userId:', userId)
            return null
          }
          
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
        <div className="space-y-8">
          <h3 className="text-lg font-semibold text-white">
            Wishlists de {(() => {
              const user = wishlistsByUser[selectedUserId].user
              const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
              return fullName || 'este usuario'
            })()}
          </h3>
          {wishlistsByUser[selectedUserId].wishlists.map((wishlist) => (
            <div key={wishlist.id} className="space-y-3">
              {/* Header de wishlist */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <h4 className="text-base font-semibold text-white truncate">{wishlist.name}</h4>
                  {wishlist.public && (
                    <span className="text-xs text-gray-400">🌐 Pública</span>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-sm text-gray-400">
                    {wishlist.items.length} producto{wishlist.items.length !== 1 ? 's' : ''}
                  </span>
                  <div 
                    className="relative" 
                    ref={(el) => {
                      if (el) {
                        confirmRefs.current.set(wishlist.id, el)
                      } else {
                        confirmRefs.current.delete(wishlist.id)
                      }
                    }}
                  >
                    {confirmingUnsave === wishlist.id ? (
                      <div 
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-20 bg-gray-900 border border-[#73FFA2]/50 rounded-lg p-3 shadow-xl whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-xs text-white mb-2">¿Quitar esta wishlist?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleUnsaveConfirm(e, wishlist.id)}
                            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          >
                            Sí
                          </button>
                          <button
                            onClick={handleUnsaveCancel}
                            className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUnsaveClick(wishlist.id)
                      }}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors"
                      title="Dejar de ver esta wishlist"
                    >
                      Quitar wishlist
                    </button>
                  </div>
                </div>
              </div>

              {/* Carrusel de productos con diseño minimalista */}
              {wishlist.items.length > 0 ? (
                <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {wishlist.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex-shrink-0 w-[120px]"
                    >
                      <div className="relative">
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-700/30">
                          {item.product.thumbnail ? (
                            <Image
                              src={item.product.thumbnail}
                              alt={item.product.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-gray-500 text-xs">Sin imagen</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-1 border border-gray-700/30 rounded-lg p-2 bg-gray-800/20">
                        {/* Nombre con tooltip */}
                        <div
                          className="text-xs text-white line-clamp-1 cursor-default"
                          title={item.product.title}
                        >
                          {item.product.title}
                        </div>
                        {/* Precio */}
                        <div className="text-xs font-semibold text-[#3B9BC3] mt-1">
                          {getDisplayPrice(item)}
                        </div>
                        {/* Acciones bajo el precio */}
                        <div className="mt-2 flex items-center justify-between gap-1">
                          {/* Carrito */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              await handleAddToCartFromWishlistItem(item)
                            }}
                            className="p-1.5 rounded bg-black/30 hover:bg-black/50 transition-colors flex-shrink-0"
                            aria-label="Agregar al carrito"
                            title="Agregar al carrito"
                          >
                            <Image
                              src="/feed/Icons/Shopping_Cart_Green.png"
                              alt="Carrito"
                              width={14}
                              height={14}
                              className="object-contain"
                              style={{ width: 'auto', height: 'auto' }}
                            />
                          </button>
                          {/* Dar Tanku */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              await handleSendAsGift(item, wishlist.userId)
                            }}
                            className="px-2.5 py-1 rounded bg-[#3B9BC3] hover:bg-[#2a8ba8] transition-colors flex-shrink-0"
                            aria-label="Dar Tanku"
                            title="Dar Tanku"
                          >
                            <span className="text-[10px] font-semibold text-white">Dar Tanku</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Ver más como texto azul al final */}
                  <button
                    onClick={() => setSelectedWishlist(wishlist)}
                    className="flex-shrink-0 text-sm text-[#3B9BC3] hover:underline px-2"
                  >
                    Ver más
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Esta wishlist está vacía
                </div>
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
          wishlistOwnerId={selectedWishlist.userId}
          isOwnWishlist={false}
        />
      )}

    </div>
  )
}

