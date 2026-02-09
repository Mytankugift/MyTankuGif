/**
 * Modal para ver todos los productos de una wishlist
 */

'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import type { WishListDTO } from '@/types/api'

interface WishlistProductsModalProps {
  wishlist: WishListDTO
  isOpen: boolean
  onClose: () => void
  onRemoveItem?: (wishListId: string, itemId: string) => Promise<void>
  wishlistOwnerId?: string
  isOwnWishlist?: boolean
}

export function WishlistProductsModal({
  wishlist,
  isOpen,
  onClose,
  onRemoveItem,
  wishlistOwnerId,
  isOwnWishlist = false,
}: WishlistProductsModalProps) {
  const router = useRouter()
  const { addItem } = useCartStore()
  const { user: currentUser } = useAuthStore()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-[#73FFA2]/40 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-[#73FFA2]">{wishlist.name}</h3>
            <p className="text-sm text-gray-400 mt-1">
              {wishlist.items.length} producto{wishlist.items.length !== 1 ? 's' : ''}
              {wishlist.public && <span className="ml-2">🌐 Pública</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content - Lista vertical */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {wishlist.items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Esta wishlist está vacía
            </div>
          ) : (
            <div className="space-y-3">
              {wishlist.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-[#73FFA2]/30 transition-all"
                >
                  <div className="flex gap-4">
                    {/* Imagen */}
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-700/30 flex-shrink-0">
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

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold mb-1">{item.product.title}</h4>
                      {item.variant && (
                        <p className="text-sm text-gray-400 mb-2">{item.variant.title}</p>
                      )}
                      {item.variant && item.variant.tankuPrice && (
                        <p className="text-lg font-bold text-[#3B9BC3] mb-3">
                          {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0,
                          }).format(item.variant.tankuPrice)}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const productHandle = item.product.handle
                            if (!productHandle) return

                            try {
                              const fullProduct = await fetchProductByHandle(productHandle)
                              if (!fullProduct) {
                                throw new Error('No se pudo cargar el producto')
                              }

                              const variants = fullProduct.variants || []
                              if (item.variantId) {
                                const variant = variants.find((v) => v.id === item.variantId)
                                if (variant) {
                                  await addItem(variant.id, 1)
                                }
                              } else if (variants.length === 1) {
                                await addItem(variants[0].id, 1)
                              } else {
                                console.warn('Producto con múltiples variantes, se necesita seleccionar')
                              }
                            } catch (error) {
                              console.error('Error agregando al carrito:', error)
                            }
                          }}
                          className="px-4 py-2 text-sm bg-[#73FFA2] text-gray-900 font-semibold rounded-lg hover:bg-[#66DEDB] transition-colors"
                        >
                          Agregar al carrito
                        </button>
                        {wishlistOwnerId && !isOwnWishlist && (
                          <button
                            onClick={async () => {
                              if (!item.variantId) {
                                alert('Este producto no tiene variante seleccionada')
                                return
                              }

                              // Validar que el usuario esté autenticado
                              if (!currentUser?.id) {
                                router.push('/feed')
                                return
                              }

                              // Validar destinatario antes de continuar
                              try {
                                const eligibility = await apiClient.get<any>(API_ENDPOINTS.GIFTS.RECIPIENT_ELIGIBILITY(wishlistOwnerId))
                                if (!eligibility.success || !eligibility.data?.canReceive) {
                                  alert(eligibility.data?.reason || 'Este usuario no puede recibir regalos')
                                  return
                                }
                                if (eligibility.data?.canSendGift === false) {
                                  alert(eligibility.data?.sendGiftReason || 'No puedes enviar regalos a este usuario')
                                  return
                                }
                              } catch (error: any) {
                                alert(error.message || 'Error validando destinatario')
                                return
                              }

                              // ✅ NUEVO: Ir directamente al checkout de regalo sin carrito
                              router.push(`/checkout/gift-direct?variantId=${item.variantId}&recipientId=${wishlistOwnerId}&quantity=1`)
                            }}
                            className="px-4 py-2 text-sm bg-[#66DEDB] text-gray-900 font-semibold rounded-lg hover:bg-[#3B9BC3] transition-colors"
                          >
                            Enviar como regalo
                          </button>
                        )}
                        {onRemoveItem && (
                          <button
                            onClick={async () => {
                              await onRemoveItem(wishlist.id, item.id)
                            }}
                            className="p-2 rounded bg-gray-700/50 hover:bg-gray-700 transition-colors"
                            aria-label="Eliminar de wishlist"
                            title="Eliminar"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                              <path d="M10 11v6"></path>
                              <path d="M14 11v6"></path>
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

