/**
 * Modal para ver todos los productos de una wishlist
 */

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useCartStore } from '@/lib/stores/cart-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import { useToast } from '@/lib/contexts/toast-context'
import { GiftEligibilityMessageModal } from '@/components/gifts/gift-eligibility-message-modal'
import type { WishListDTO } from '@/types/api'

interface ProductStock {
  [variantId: string]: number
}

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
  const { error: showError, success: showSuccess } = useToast()
  const [productStocks, setProductStocks] = useState<ProductStock>({})
  const [loadingStocks, setLoadingStocks] = useState<{ [key: string]: boolean }>({})
  const [giftEligibilityMessage, setGiftEligibilityMessage] = useState<string | null>(null)

  // Cargar stock de todos los productos al abrir el modal
  useEffect(() => {
    if (isOpen && wishlist.items.length > 0) {
      const loadStocks = async () => {
        const stocks: ProductStock = {}
        for (const item of wishlist.items) {
          if (item.variantId) {
            try {
              setLoadingStocks((prev) => ({ ...prev, [item.variantId!]: true }))
              const variantResponse = await apiClient.get<any>(API_ENDPOINTS.PRODUCTS.VARIANT_BY_ID(item.variantId))
              if (variantResponse.success && variantResponse.data) {
                stocks[item.variantId] = variantResponse.data.stock || 0
              }
            } catch (error) {
              console.error(`Error cargando stock para variante ${item.variantId}:`, error)
              stocks[item.variantId] = 0
            } finally {
              setLoadingStocks((prev => {
                const newState = { ...prev }
                delete newState[item.variantId!]
                return newState
              }))
            }
          }
        }
        setProductStocks(stocks)
      }
      loadStocks()
    }
  }, [isOpen, wishlist.items])

  useEffect(() => {
    if (!isOpen) setGiftEligibilityMessage(null)
  }, [isOpen])

  if (!isOpen && !giftEligibilityMessage) return null

  return (
    <>
    {isOpen ? (
    <div
      className="fixed inset-0 z-[1000002] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#262626] border border-[#73FFA2]/45 rounded-[25px] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
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
            className="h-9 w-9 rounded-full bg-white/10 text-gray-200 hover:bg-white/20 transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content - móvil 1 por fila para priorizar legibilidad */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {wishlist.items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Esta wishlist está vacía
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {wishlist.items.map((item) => {
                const stock = item.variantId ? (productStocks[item.variantId] ?? null) : null
                const isLoadingStock = item.variantId ? loadingStocks[item.variantId] : false
                const isOutOfStock = stock !== null && stock <= 0
                const isLowStock = stock !== null && stock > 0 && stock < 5
                const productHandle = item.product.handle

                return (
                  <div
                    key={item.id}
                    className="bg-gray-800/50 rounded-[25px] p-3 border border-gray-700 hover:border-[#73FFA2]/30 transition-all flex gap-3 relative"
                  >
                    {/* Botón eliminar - esquina superior derecha (solo para wishlists de amigos) */}
                    {onRemoveItem && wishlistOwnerId && !isOwnWishlist && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await onRemoveItem(wishlist.id, item.id)
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-700/80 hover:bg-gray-700 transition-colors z-10"
                        aria-label="Eliminar de wishlist"
                        title="Eliminar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                          <path d="M10 11v6"></path>
                          <path d="M14 11v6"></path>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                        </svg>
                      </button>
                    )}

                    {/* Imagen clickeable - izquierda */}
                    {productHandle ? (
                      <Link 
                        href={`/products/${productHandle}`}
                        className="relative w-20 h-20 flex-shrink-0 rounded-[25px] overflow-hidden bg-gray-700/30 hover:opacity-80 transition-opacity"
                      >
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
                      </Link>
                    ) : (
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-[25px] overflow-hidden bg-gray-700/30">
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
                    )}

                    {/* Info - derecha */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1 line-clamp-1 text-sm">{item.product.title}</h4>
                        {item.variant && (
                          <p className="text-xs text-gray-400 mb-1 line-clamp-1">{item.variant.title}</p>
                        )}
                        
                        {/* Stock */}
                        {item.variantId && (
                          <div className="mb-1">
                            {isLoadingStock ? (
                              <p className="text-xs text-gray-500">Verificando stock...</p>
                            ) : stock !== null && (isOutOfStock || isLowStock) ? (
                              <p className={`text-xs font-medium ${
                                isOutOfStock 
                                  ? 'text-red-400' 
                                  : isLowStock 
                                  ? 'text-yellow-400' 
                                  : 'text-[#73FFA2]'
                              }`}>
                                {isOutOfStock
                                  ? '❌ Agotado'
                                  : isLowStock
                                  ? '⚠️ Stock bajo'
                                  : null}
                              </p>
                            ) : null}
                          </div>
                        )}

                        {item.variant && item.variant.tankuPrice && (
                          <p className="text-sm font-bold text-[#3B9BC3]">
                            {new Intl.NumberFormat('es-CO', {
                              style: 'currency',
                              currency: 'COP',
                              minimumFractionDigits: 0,
                            }).format(item.variant.tankuPrice)}
                          </p>
                        )}
                      </div>

                      {/* Botones - debajo de la info */}
                      <div className="flex flex-col gap-2 mt-2">
                        {/* Primera fila: iconos sin círculo (solo para wishlists propias) */}
                        {isOwnWishlist && (
                          <div className="flex items-center gap-2">
                            {/* Icono agregar al carrito - sin círculo */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                const productHandle = item.product.handle
                                if (!productHandle) return

                                try {
                                  const fullProduct = await fetchProductByHandle(productHandle)
                                  if (!fullProduct) {
                                    showError('No se pudo cargar el producto')
                                    return
                                  }

                                  const variants = fullProduct.variants || []
                                  if (item.variantId) {
                                    const variant = variants.find((v) => v.id === item.variantId)
                                    if (variant) {
                                      await addItem(variant.id, 1)
                                      showSuccess('Producto agregado al carrito')
                                    }
                                  } else if (variants.length === 1) {
                                    await addItem(variants[0].id, 1)
                                    showSuccess('Producto agregado al carrito')
                                  } else {
                                    showError('Este producto tiene múltiples variantes')
                                  }
                                } catch (error) {
                                  console.error('Error agregando al carrito:', error)
                                  showError('Error al agregar producto al carrito')
                                }
                              }}
                              className="hover:opacity-80 transition-opacity flex-shrink-0"
                              title="Agregar al carrito"
                            >
                              <Image
                                src="/feed/Icons/Shopping_Cart_Green.png"
                                alt="Carrito"
                                width={20}
                                height={20}
                                unoptimized
                              />
                            </button>

                            {/* Botón eliminar - sin círculo */}
                            {onRemoveItem && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  await onRemoveItem(wishlist.id, item.id)
                                }}
                                className="hover:opacity-80 transition-opacity flex-shrink-0"
                                aria-label="Eliminar de wishlist"
                                title="Eliminar"
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                  <path d="M10 11v6"></path>
                                  <path d="M14 11v6"></path>
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                                </svg>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Botón Comprar ahora - solo para wishlists propias */}
                        {isOwnWishlist && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              const productHandle = item.product.handle
                              if (!productHandle) return

                              try {
                                const fullProduct = await fetchProductByHandle(productHandle)
                                if (!fullProduct) {
                                  showError('No se pudo cargar el producto')
                                  return
                                }

                                const variants = fullProduct.variants || []
                                if (item.variantId) {
                                  const variant = variants.find((v) => v.id === item.variantId)
                                  if (variant) {
                                    await addItem(variant.id, 1)
                                    router.push('/cart')
                                  }
                                } else if (variants.length === 1) {
                                  await addItem(variants[0].id, 1)
                                  router.push('/cart')
                                } else {
                                  showError('Este producto tiene múltiples variantes')
                                }
                              } catch (error) {
                                console.error('Error en comprar ahora:', error)
                                showError('Error al procesar compra')
                              }
                            }}
                            className="w-full px-3 py-2 text-sm font-semibold bg-[#73FFA2] text-gray-900 rounded-[25px] hover:bg-[#66DEDB] transition-colors"
                          >
                            Comprar ahora
                          </button>
                        )}

                        {/* Para wishlists de amigos: icono carrito sin círculo + Regalar Tanku */}
                        {wishlistOwnerId && !isOwnWishlist && (
                          <div className="flex items-center gap-2">
                            {/* Icono agregar al carrito - sin círculo */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                const productHandle = item.product.handle
                                if (!productHandle) return

                                try {
                                  const fullProduct = await fetchProductByHandle(productHandle)
                                  if (!fullProduct) {
                                    showError('No se pudo cargar el producto')
                                    return
                                  }

                                  const variants = fullProduct.variants || []
                                  if (item.variantId) {
                                    const variant = variants.find((v) => v.id === item.variantId)
                                    if (variant) {
                                      await addItem(variant.id, 1)
                                      showSuccess('Producto agregado al carrito')
                                    }
                                  } else if (variants.length === 1) {
                                    await addItem(variants[0].id, 1)
                                    showSuccess('Producto agregado al carrito')
                                  } else {
                                    showError('Este producto tiene múltiples variantes')
                                  }
                                } catch (error) {
                                  console.error('Error agregando al carrito:', error)
                                  showError('Error al agregar producto al carrito')
                                }
                              }}
                              className="hover:opacity-80 transition-opacity flex-shrink-0"
                              title="Agregar al carrito"
                            >
                              <Image
                                src="/feed/Icons/Shopping_Cart_Green.png"
                                alt="Carrito"
                                width={20}
                                height={20}
                                unoptimized
                              />
                            </button>

                            {/* Botón Regalar Tanku */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (!item.variantId) {
                                  showError('Este producto no tiene variante seleccionada')
                                  return
                                }

                                // Validar que el usuario esté autenticado
                                if (!currentUser?.id) {
                                  router.push('/feed')
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
                                  const eligibility = await apiClient.get<any>(API_ENDPOINTS.GIFTS.RECIPIENT_ELIGIBILITY(wishlistOwnerId))
                                  if (!eligibility.success || !eligibility.data?.canReceive) {
                                    setGiftEligibilityMessage(
                                      eligibility.data?.reason || 'Este usuario no puede recibir regalos',
                                    )
                                    return
                                  }
                                  if (eligibility.data?.canSendGift === false) {
                                    setGiftEligibilityMessage(
                                      eligibility.data?.sendGiftReason || 'No puedes enviar regalos a este usuario',
                                    )
                                    return
                                  }
                                } catch (error: any) {
                                  setGiftEligibilityMessage(error.message || 'Error validando destinatario')
                                  return
                                }

                                // ✅ NUEVO: Ir directamente al checkout de regalo sin carrito
                                router.push(`/checkout/gift-direct?variantId=${item.variantId}&recipientId=${wishlistOwnerId}&quantity=1`)
                              }}
                              disabled={isOutOfStock}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 flex-1 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] ${
                                isOutOfStock
                                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                  : 'bg-[linear-gradient(90deg,#3B9BC3_0%,#2A5B74_100%)] text-white hover:opacity-90'
                              }`}
                            >
                              Regalar Tanku
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    ) : null}
    <GiftEligibilityMessageModal
      open={Boolean(giftEligibilityMessage?.trim())}
      message={giftEligibilityMessage ?? ''}
      onClose={() => setGiftEligibilityMessage(null)}
    />
    </>
  )
}

