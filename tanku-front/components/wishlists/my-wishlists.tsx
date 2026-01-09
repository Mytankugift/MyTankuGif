/**
 * Componente para mostrar las wishlists propias del usuario
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useWishLists } from '@/lib/hooks/use-wishlists'
import { useCartStore } from '@/lib/stores/cart-store'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import { WishlistProductsModal } from './wishlist-products-modal'
import type { WishListDTO } from '@/types/api'

export function MyWishlists() {
  const { wishLists, fetchWishLists, createWishList, deleteWishList, updateWishList, removeItemFromWishList, isLoading } =
    useWishLists()
  const { addItem } = useCartStore()
  const [selectedWishlist, setSelectedWishlist] = useState<WishListDTO | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingWishlist, setEditingWishlist] = useState<WishListDTO | null>(null)
  const [newName, setNewName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [openVisibilityFor, setOpenVisibilityFor] = useState<string | null>(null)
  const [priceCache, setPriceCache] = useState<Record<string, number>>({})
  const inFlightKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetchWishLists()
  }, [fetchWishLists])

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

  const handleDelete = async (wishlistId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta wishlist?')) {
      await deleteWishList(wishlistId)
    }
  }

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

  const ensurePrice = async (item: WishListDTO['items'][0]) => {
    const key = `${item.product.id}:${item.variantId || 'default'}`
    if (item.variant?.price !== undefined && item.variant?.price !== null) {
      setPriceCache((prev) => ({ ...prev, [key]: item.variant!.price as number }))
      return
    }
    if (priceCache[key] !== undefined || inFlightKeysRef.current.has(key)) return
    inFlightKeysRef.current.add(key)
    try {
      const handle = item.product.handle
      if (!handle) return
      const full = await fetchProductByHandle(handle)
      const variants = full?.variants || []
      let price = 0
      if (item.variantId) {
        const v = variants.find((x: any) => x.id === item.variantId)
        price = v?.price || 0
      } else if (variants.length === 1) {
        price = variants[0].price
      } else if (variants.length > 1) {
        // Tomar la variante con precio mínimo como fallback
        price = variants.reduce((min: number, v: any) => (min === 0 ? v.price : Math.min(min, v.price)), 0)
      }
      if (price) {
        setPriceCache((prev) => ({ ...prev, [key]: price }))
      }
    } finally {
      inFlightKeysRef.current.delete(key)
    }
  }

  const getDisplayPrice = (item: WishListDTO['items'][0]) => {
    const key = `${item.product.id}:${item.variantId || 'default'}`
    const val = item.variant?.price ?? priceCache[key]
    return typeof val === 'number' && val > 0 ? formatPrice(val) : '—'
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
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="text-sm text-[#73FFA2] hover:text-[#66DEDB] transition-colors"
        >
          + Crear wishlist
        </button>
      </div>

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
                        onClick={() => handleDelete(wishlist.id)}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                      >
                        Eliminar
                      </button>
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
                            if (!item.variant?.price) {
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
        />
      )}
    </div>
  )
}

