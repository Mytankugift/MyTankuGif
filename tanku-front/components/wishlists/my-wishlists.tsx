/**
 * Componente para mostrar las wishlists propias del usuario
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useWishLists } from '@/lib/hooks/use-wishlists'
import { useCartStore } from '@/lib/stores/cart-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import { WishlistProductsModal } from './wishlist-products-modal'
import { ShareWishlistModal } from './share-wishlist-modal'
import { WishlistAccessManager } from './wishlist-access-manager'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { WishListDTO } from '@/types/api'

interface RecommendedWishlist {
  name: string
  description: string
}

export function MyWishlists() {
  const { wishLists, fetchWishLists, createWishList, deleteWishList, updateWishList, removeItemFromWishList, isLoading } =
    useWishLists()
  const { addItem } = useCartStore()
  const { user } = useAuthStore()
  const [selectedWishlist, setSelectedWishlist] = useState<WishListDTO | null>(null)
  const [shareWishlist, setShareWishlist] = useState<WishListDTO | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingWishlist, setEditingWishlist] = useState<WishListDTO | null>(null)
  const [newName, setNewName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [openVisibilityFor, setOpenVisibilityFor] = useState<string | null>(null)
  const [priceCache, setPriceCache] = useState<Record<string, number>>({})
  const inFlightKeysRef = useRef<Set<string>>(new Set())
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const confirmDeleteRef = useRef<HTMLDivElement>(null)
  const [recommendedWishlists, setRecommendedWishlists] = useState<RecommendedWishlist[]>([])
  const [showRecommendedWishlists, setShowRecommendedWishlists] = useState(false)

  useEffect(() => {
    fetchWishLists()
    loadRecommendedWishlists()
  }, [fetchWishLists])

  const loadRecommendedWishlists = async () => {
    try {
      const response = await apiClient.get<RecommendedWishlist[]>(API_ENDPOINTS.WISHLISTS.RECOMMENDED)
      if (response.success && response.data) {
        setRecommendedWishlists(Array.isArray(response.data) ? response.data : [])
      }
    } catch (error) {
      console.error('Error al cargar wishlists recomendadas:', error)
    }
  }

  const handleShowRecommendedWishlists = () => {
    setShowRecommendedWishlists(true)
  }

  const handleCloseRecommendedWishlists = () => {
    setShowRecommendedWishlists(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('tanku_hide_recommended_wishlists', 'true')
    }
  }

  const useRecommendedWishlist = (recommended: RecommendedWishlist) => {
    setNewName(recommended.name)
    setIsPublic(false) // Por defecto privada
    setIsCreateModalOpen(true)
    setShowRecommendedWishlists(false)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    await createWishList(newName.trim(), isPublic)
    setIsCreateModalOpen(false)
    setNewName('')
    setIsPublic(false)
  }

  const handleEdit = async (wishlist: WishListDTO) => {
    if (!newName.trim()) return
    await updateWishList(wishlist.id, newName.trim(), isPublic)
    setEditingWishlist(null)
    setNewName('')
    setIsPublic(false)
  }

  const handleDeleteClick = (wishlistId: string) => {
    setConfirmingDelete(wishlistId)
  }

  const handleDeleteConfirm = async (wishlistId: string) => {
    await deleteWishList(wishlistId)
    setConfirmingDelete(null)
  }

  const handleDeleteCancel = () => {
    setConfirmingDelete(null)
  }

  // Cerrar globito al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (confirmDeleteRef.current && !confirmDeleteRef.current.contains(event.target as Node)) {
        setConfirmingDelete(null)
      }
    }

    if (confirmingDelete) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [confirmingDelete])

  const handleRemoveItem = async (wishListId: string, itemId: string) => {
    await removeItemFromWishList(wishListId, itemId)
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  
  // Calcular precio final: (precio * 1.15) + 10,000
  const calculateFinalPrice = (basePrice: number): number => {
    return Math.round((basePrice * 1.15) + 10000)
  }

  const handleAddToCartFromWishlistItem = async (item: WishListDTO['items'][0]) => {
    // Si ya tenemos variantId guardada, agregamos directo
    if (item.variantId) {
      await addItem(item.variantId, 1)
      return
    }

    // Fallback: intentar resolver si el producto tiene una sola variante
    const handle = item.product.handle
    if (!handle) return
    const fullProduct = await fetchProductByHandle(handle)
    const variants = fullProduct?.variants || []
    if (variants.length === 1) {
      await addItem(variants[0].id, 1)
      return
    }

    // Si tiene múltiples variantes, por ahora abrimos el modal "Ver más" para selección
    // (luego podemos hacer selector de variantes acá mismo)
    setSelectedWishlist((prev) => prev || null)
  }

  // ensurePrice ya no es necesario porque tankuPrice viene del backend
  // Mantenemos la función por compatibilidad pero no hace nada
  const ensurePrice = async (item: WishListDTO['items'][0]) => {
    // No hacer nada, tankuPrice ya viene del backend
  }

  const getDisplayPrice = (item: WishListDTO['items'][0]) => {
    // Usar tankuPrice directamente (ya calculado en sync)
    const finalPrice = item.variant?.tankuPrice || 0
    
    if (finalPrice > 0) {
      return formatPrice(finalPrice)
    }
    return '—'
    }

  const startEdit = (wishlist: WishListDTO) => {
    setEditingWishlist(wishlist)
    setNewName(wishlist.name)
    setIsPublic(wishlist.public)
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center text-gray-400">
        Cargando wishlists...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con acción crear (minimalista) */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#66DEDB]">Mis Wishlists</h2>
        <div className="flex gap-2">
          {/* Botón de sugerencias - siempre visible si hay sugerencias */}
          {recommendedWishlists.length > 0 && !showRecommendedWishlists && (
            <button
              onClick={handleShowRecommendedWishlists}
              className="text-sm text-gray-400 hover:text-[#73FFA2] transition-colors"
            >
              Ver Sugerencias
            </button>
          )}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="text-sm text-[#73FFA2] hover:text-[#66DEDB] transition-colors"
          >
            + Crear wishlist
          </button>
        </div>
      </div>

      {/* Wishlists recomendadas */}
      {showRecommendedWishlists && recommendedWishlists.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-3 relative">
          <button
            onClick={handleCloseRecommendedWishlists}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 transition-colors"
            title="Cerrar"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
          <h4 className="text-xs font-medium text-gray-400 mb-2 pr-6">Sugerencias</h4>
          <div className="flex flex-wrap gap-1.5">
            {recommendedWishlists.map((rec, index) => (
              <button
                key={index}
                onClick={() => {
                  useRecommendedWishlist(rec)
                }}
                className="text-left px-2.5 py-1.5 rounded bg-gray-700/50 hover:bg-gray-700 transition-colors text-xs"
              >
                <div className="text-white font-medium">{rec.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de wishlists */}
      {wishLists.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No tienes wishlists aún</p>
          <p className="text-sm mt-2">Crea una nueva wishlist para comenzar</p>
        </div>
      ) : (
        <div className="space-y-8">
          {wishLists.map((wishlist) => (
            <div key={wishlist.id} className="space-y-3">
              {/* Header de wishlist */}
              <div className="flex items-center justify-between gap-4">
                {editingWishlist?.id === wishlist.id ? (
                  <div className="flex-1 flex items-center gap-3">
                    {/* Edición inline del nombre */}
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleEdit(wishlist)
                        } else if (e.key === 'Escape') {
                          setEditingWishlist(null)
                          setNewName('')
                          setIsPublic(false)
                        }
                      }}
                      className="px-2 py-1 bg-transparent border-b border-[#73FFA2] text-white focus:outline-none focus:border-[#66DEDB] min-w-0"
                      style={{ maxWidth: '300px' }}
                      autoFocus
                    />
                    {/* Selector de visibilidad (segmentado) */}
                    <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                      <button
                        onClick={() => setIsPublic(true)}
                        className={`px-3 py-2 text-sm ${isPublic ? 'bg-[#73FFA2] text-gray-900' : 'text-gray-300 hover:text-white'}`}
                      >
                        Pública
                      </button>
                      <button
                        onClick={() => setIsPublic(false)}
                        className={`px-3 py-2 text-sm ${!isPublic ? 'bg-[#73FFA2] text-gray-900' : 'text-gray-300 hover:text-white'}`}
                      >
                        Privada
                      </button>
                    </div>
                    <button
                      onClick={() => handleEdit(wishlist)}
                      className="text-sm text-[#73FFA2] hover:text-[#66DEDB] transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setEditingWishlist(null)
                        setNewName('')
                        setIsPublic(false)
                      }}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <h3 className="text-base font-semibold text-white truncate">{wishlist.name}</h3>
                      {/* Icono editar al lado del texto */}
                      <button
                        onClick={() => startEdit(wishlist)}
                        className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                        title="Editar nombre"
                        aria-label="Editar"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                        </svg>
                      </button>
                      {/* Selector inline de pública/privada */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenVisibilityFor(openVisibilityFor === wishlist.id ? null : wishlist.id)}
                          className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          {wishlist.public ? '🌐 Pública' : 'Privada'}
                        </button>
                        {openVisibilityFor === wishlist.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenVisibilityFor(null)}
                            />
                            <div className="absolute z-20 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl">
                              <button
                                onClick={async () => {
                                  await updateWishList(wishlist.id, undefined, true)
                                  setOpenVisibilityFor(null)
                                }}
                                className="block px-3 py-1.5 text-left text-xs text-white hover:bg-gray-800 w-full"
                              >
                                Pública
                              </button>
                              <button
                                onClick={async () => {
                                  await updateWishList(wishlist.id, undefined, false)
                                  setOpenVisibilityFor(null)
                                }}
                                className="block px-3 py-1.5 text-left text-xs text-white hover:bg-gray-800 w-full"
                              >
                                Privada
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-sm text-gray-400">
                        {wishlist.items.length} producto{wishlist.items.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => setShareWishlist(wishlist)}
                        className="text-sm text-[#73FFA2] hover:text-[#66DEDB] transition-colors"
                        title="Compartir wishlist"
                      >
                        Compartir
                      </button>
                      <WishlistAccessManager wishlistId={wishlist.id} isPrivate={!wishlist.public} />
                      <div className="relative" ref={confirmDeleteRef}>
                        {confirmingDelete === wishlist.id ? (
                          <div className="absolute bottom-full right-0 mb-2 z-20 bg-gray-900 border border-[#73FFA2]/50 rounded-lg p-3 shadow-xl whitespace-nowrap">
                            <p className="text-xs text-white mb-2">¿Eliminar esta wishlist?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDeleteConfirm(wishlist.id)}
                                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              >
                                Sí
                              </button>
                              <button
                                onClick={handleDeleteCancel}
                                className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                              >
                                No
                              </button>
                            </div>
                          </div>
                        ) : null}
                        <button
                          onClick={() => handleDeleteClick(wishlist.id)}
                          className="text-sm text-red-400 hover:text-red-300 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Carrusel de productos */}
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
                          {(() => {
                            // Llamada perezosa para asegurar precio si falta
                            if (!item.variant?.tankuPrice) {
                              // No await: dispara cálculo y luego re-renderiza por setState
                              ensurePrice(item)
                            }
                            return getDisplayPrice(item)
                          })()}
                        </div>
                        {/* Acciones bajo el precio - distribuidas */}
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
                          {/* Basurita */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveItem(wishlist.id, item.id)
                            }}
                            className="p-1.5 rounded bg-black/30 hover:bg-black/50 transition-colors flex-shrink-0"
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

      {/* Modal para crear wishlist */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="bg-gray-900 border border-[#73FFA2]/40 rounded-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-[#73FFA2] mb-4">Crear Wishlist</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Nombre</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Mi wishlist"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#73FFA2]"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 text-[#73FFA2] bg-gray-800 border-gray-700 rounded"
                />
                <span className="text-sm text-gray-300">Wishlist pública</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setNewName('')
                    setIsPublic(false)
                  }}
                  className="flex-1 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="flex-1 py-2 bg-[#73FFA2] text-gray-900 font-semibold rounded-lg hover:bg-[#66DEDB] transition-colors disabled:opacity-50"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver todos los productos */}
      {selectedWishlist && (
        <WishlistProductsModal
          wishlist={selectedWishlist}
          isOpen={!!selectedWishlist}
          onClose={() => setSelectedWishlist(null)}
          onRemoveItem={handleRemoveItem}
          wishlistOwnerId={user?.id}
          isOwnWishlist={true}
        />
      )}
      
      {/* Modal de compartir wishlist */}
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

