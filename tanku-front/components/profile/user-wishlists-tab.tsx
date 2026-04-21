'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { apiClient } from '@/lib/api/client'
import { useToast } from '@/lib/contexts/toast-context'
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
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const { addItem, cart } = useCartStore()
  const { error: showError } = useToast()
  const [wishlists, setWishlists] = useState<WishListDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWishlist, setSelectedWishlist] = useState<WishListDTO | null>(null)
  const [shareWishlist, setShareWishlist] = useState<WishListDTO | null>(null)
  const [savedWishlistIds, setSavedWishlistIds] = useState<Set<string>>(new Set())
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set())
  const [backendCanViewPrivate, setBackendCanViewPrivate] = useState(false)
  const loadingRef = useRef(false)
  const isOwnWishlist = currentUser?.id === userId

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
      .filter(w => !w.public && 
                   currentUser.id !== userId && 
                   Array.isArray(w.items) && 
                   w.items.length > 0 && 
                   !backendCanViewPrivate)
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
    if (!currentUser?.id) return
    try {
      const response = await apiClient.post(API_ENDPOINTS.WISHLISTS.REQUEST_ACCESS(wishlistId))
      if (response.success) {
        // Actualizar estado local inmediatamente para mostrar "Cancelar solicitud" (on-demand)
        setPendingRequestIds((prev) => {
          const newSet = new Set([...prev, wishlistId])
          console.log('🔍 [REQUEST ACCESS] Estado actualizado localmente, pendingRequestIds:', Array.from(newSet))
          return newSet
        })
        // NO recargar inmediatamente - el estado local es suficiente para mostrar el botón
        alert('Solicitud de acceso enviada')
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
      }
    } catch (error: any) {
      console.error('Error cancelando solicitud:', error)
      const errorMessage = error.response?.data?.error?.message || 'Error al cancelar la solicitud'
      alert(errorMessage)
    }
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)

  const getDisplayPrice = (item: WishListDTO['items'][0]) => {
    const finalPrice = item.variant?.tankuPrice || 0
    if (finalPrice > 0) {
      return formatPrice(finalPrice)
    }
    return '—'
  }

  const handleAddToCartFromWishlistItem = async (item: WishListDTO['items'][0]) => {
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

  // Función helper para obtener el nombre del usuario
  const getUserName = async (userId: string): Promise<string> => {
    try {
      // Hacer petición al backend
      const response = await apiClient.get<any>(API_ENDPOINTS.USERS.BY_ID(userId))
      if (response.success && response.data) {
        const user = response.data.user || response.data
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
        if (fullName) return fullName
        return user.username || 'este usuario'
      }
      return 'este usuario'
    } catch (error) {
      console.error('Error obteniendo nombre del usuario:', error)
      return 'este usuario'
    }
  }

  const handleSendAsGift = async (item: WishListDTO['items'][0]) => {
    if (!item.variantId) {
      showError('Este producto no tiene variante seleccionada')
      return
    }

    // Validar que el usuario esté autenticado
    if (!currentUser?.id) {
      router.push('/feed') // Redirigir al login
      return
    }

    // Validar stock antes de continuar
    try {
      const variantResponse = await apiClient.get<any>(API_ENDPOINTS.PRODUCTS.VARIANT_BY_ID(item.variantId))
      if (variantResponse.success && variantResponse.data) {
        const stock = variantResponse.data.stock || 0
                                    if (stock <= 0) {
                                      showError('Este producto está agotado')
          return
        }
        if (stock < 1) {
                                      showError('Stock insuficiente')
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
      const eligibility = await apiClient.get<any>(API_ENDPOINTS.GIFTS.RECIPIENT_ELIGIBILITY(userId))
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
    router.push(`/checkout/gift-direct?variantId=${item.variantId}&recipientId=${userId}&quantity=1`)
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
    <div className="space-y-8">
      {wishlists.map((wishlist) => {
        const isPrivate = !wishlist.public
        const isSaved = savedWishlistIds.has(wishlist.id)
        const itemsArray = Array.isArray(wishlist.items) ? wishlist.items : []
        const isOwnWishlist = currentUser?.id === userId
        
        // Detectar acceso aprobado: privada con items y no es propia
        // Si una wishlist privada tiene items, significa que tiene acceso aprobado
        const hasApprovedAccess = isPrivate && 
                                  !isOwnWishlist && 
                                  itemsArray.length > 0
        
        // canView: pública O (privada Y acceso aprobado)
        const canView = !isPrivate || hasApprovedAccess
        
        // Si tiene acceso aprobado, NO debería tener solicitud pendiente
        const hasPendingRequest = hasApprovedAccess ? false : pendingRequestIds.has(wishlist.id)
        
        // Solo log si es privada y hay algo importante que reportar (acceso aprobado o items)
        if (isPrivate && !isOwnWishlist && (hasApprovedAccess || itemsArray.length > 0)) {
          console.log(`🔍 [WISHLIST] "${wishlist.name}": acceso=${hasApprovedAccess}, items=${itemsArray.length}, canView=${canView}`)
        }

        return (
          <div key={wishlist.id} className="space-y-3">
            {/* Header de wishlist */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <h4 className="text-base font-semibold text-white truncate">{wishlist.name}</h4>
                {isPrivate ? (
                  <LockClosedIcon className="w-4 h-4 text-gray-400 flex-shrink-0" title="Privada" />
                ) : (
                  <span className="text-xs text-gray-400">🌐 Pública</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isPrivate && !isOwnWishlist && !canView && (
                  hasPendingRequest ? (
                    <button
                      onClick={() => handleCancelAccessRequest(wishlist.id)}
                      className="px-2.5 py-1 text-[10px] font-semibold rounded-full border border-gray-600/60 text-gray-300 hover:bg-white/5 transition-colors"
                    >
                      Cancelar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRequestAccess(wishlist.id)}
                      className="px-2.5 py-1 text-[10px] font-semibold rounded-full text-black shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] hover:opacity-90 transition-opacity"
                      style={{ background: 'linear-gradient(90deg, #73FFA2 0%, #1A485C 100%)' }}
                    >
                      Solicitar acceso
                    </button>
                  )
                )}
                {canView && itemsArray.length > 0 ? (
                  <span className="text-sm text-gray-400">
                    {itemsArray.length} producto{itemsArray.length !== 1 ? 's' : ''}
                  </span>
                ) : isPrivate && !canView ? (
                  <span className="text-sm text-gray-500 italic">
                    Privada
                  </span>
                ) : null}
                {!isOwnWishlist && canView && (
                  <>
                    {isSaved ? (
                      <button
                        onClick={() => handleUnsaveWishlist(wishlist.id)}
                        className="text-sm text-[#73FFA2] hover:text-[#66DEDB] transition-colors"
                        title="Desguardar wishlist"
                      >
                        Guardada
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSaveWishlist(wishlist.id)}
                        className="text-sm text-[#73FFA2] hover:text-[#66DEDB] transition-colors flex items-center gap-1"
                        title="Guardar wishlist"
                      >
                        <BookmarkIcon className="w-4 h-4" />
                        Guardar
                      </button>
                    )}
                  </>
                )}
                {isOwnWishlist && (
                  <button
                    onClick={() => setShareWishlist(wishlist)}
                    className="text-sm text-[#73FFA2] hover:text-[#66DEDB] transition-colors"
                    title="Compartir wishlist"
                  >
                    <ShareIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Carrusel de productos con diseño minimalista (solo si puede ver y tiene items) */}
            {canView && itemsArray.length > 0 ? (
              <div className="flex items-start gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto pb-2 scrollbar-hide [-webkit-overflow-scrolling:touch]">
                  {itemsArray.map((item) => (
                    <div
                      key={item.id}
                      className="flex-shrink-0 w-[142px] sm:w-[152px]"
                    >
                    <div className="relative">
                      <div className="relative h-[88px] w-full rounded-lg overflow-hidden bg-gray-700/30">
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
                        className="text-xs text-white line-clamp-2 min-h-[2rem] cursor-default"
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
                        {/* Dar Tanku - solo si no es tu propia wishlist */}
                        {!isOwnWishlist && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              await handleSendAsGift(item)
                            }}
                            className="px-2.5 py-1 rounded-full bg-[linear-gradient(90deg,#3B9BC3_0%,#2A5B74_100%)] hover:opacity-90 transition-all duration-200 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] flex-shrink-0"
                            aria-label="Dar Tanku"
                            title="Dar Tanku"
                          >
                            <span className="text-[10px] font-semibold text-white">Dar Tanku</span>
                          </button>
                        )}
                      </div>
                    </div>
                    </div>
                  ))}
                </div>

                {/* Ver más siempre visible fuera del slider */}
                <button
                  onClick={() => setSelectedWishlist(wishlist)}
                  className="self-center flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold text-black shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(90deg, #73FFA2 0%, #1A485C 100%)' }}
                >
                  Abrir
                </button>
              </div>
            ) : canView && itemsArray.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Esta wishlist está vacía
              </div>
            ) : null}

            {isPrivate && !isOwnWishlist && !canView && (
              <div className="text-center py-3 text-gray-400 text-xs">
                Esta wishlist es privada
              </div>
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
          wishlistOwnerId={userId}
          isOwnWishlist={isOwnWishlist}
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

