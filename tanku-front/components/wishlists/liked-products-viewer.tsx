/**
 * Productos de la wishlist automática "Me gusta" — mismas mini cards que `WishlistInlineProducts`,
 * acciones tipo /feed: carrito azul, agregar a wishlist azul, × en la imagen como en mis wishlists.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { useToast } from '@/lib/contexts/toast-context'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import { WishlistSelectorModal } from './wishlist-selector-modal'
import type { WishListDTO } from '@/types/api'

const CARD_CELL = 'min-w-0'

function formatCop(price: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price)
}

export function LikedProductsViewer() {
  const { isAuthenticated } = useAuthStore()
  const { addItem } = useCartStore()
  const { error: showError, success: showSuccess } = useToast()
  const [wishlist, setWishlist] = useState<WishListDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined)
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false)
  const [cartLoadingId, setCartLoadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    void fetchLikedWishlist()
  }, [isAuthenticated])

  const fetchLikedWishlist = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get<WishListDTO | null>(API_ENDPOINTS.WISHLISTS.LIKED)
      if (response.success) {
        setWishlist(response.data)
      }
    } catch (error) {
      console.error('Error cargando wishlist "Me gusta":', error)
      setWishlist(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCart = useCallback(
    async (item: WishListDTO['items'][0]) => {
      const handle = item.product.handle
      if (!handle) {
        showError('Sin enlace de producto')
        return
      }
      setCartLoadingId(item.id)
      try {
        const fullProduct = await fetchProductByHandle(handle)
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
          return
        }
        if (variants.length === 1) {
          await addItem(variants[0].id, 1)
          showSuccess('Producto agregado al carrito')
          return
        }
        showError('Este producto tiene múltiples variantes')
      } catch {
        showError('Error al agregar producto al carrito')
      } finally {
        setCartLoadingId(null)
      }
    },
    [addItem, showError, showSuccess],
  )

  const handleRemoveItem = async (itemId: string) => {
    if (!wishlist) return

    const listId = wishlist.id
    const productId = wishlist.items.find((item) => item.id === itemId)?.product.id
    const previous = wishlist

    setWishlist((prev) => {
      if (!prev) return null
      return {
        ...prev,
        items: prev.items.filter((item) => item.id !== itemId),
      }
    })

    try {
      if (productId) {
        await apiClient.delete(API_ENDPOINTS.PRODUCTS.UNLIKE(productId))
      }
      const response = await apiClient.delete(API_ENDPOINTS.WISHLISTS.REMOVE_ITEM(listId, itemId))
      if (!response.success) {
        setWishlist(previous)
        showError('No se pudo quitar el producto')
      }
    } catch (error) {
      console.error('Error removiendo item:', error)
      setWishlist(previous)
      showError('Error al quitar de favoritos')
    }
  }

  const openWishlistSelector = (item: WishListDTO['items'][0]) => {
    setSelectedProductId(item.product.id)
    setSelectedVariantId(item.variantId || undefined)
    setIsWishlistModalOpen(true)
  }

  const closeWishlistSelector = () => {
    setIsWishlistModalOpen(false)
    setSelectedProductId(null)
    setSelectedVariantId(undefined)
  }

  if (!isAuthenticated) {
    return (
      <div className="py-8 text-center text-zinc-500">
        Debes iniciar sesión para ver tus productos favoritos
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center text-zinc-500">
        Cargando productos…
      </div>
    )
  }

  if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            <h2 className="text-2xl font-bold text-[#66DEDB]">Me gusta</h2>
          </div>
          <Link
            href="/wishlist"
            scroll={false}
            className="shrink-0 text-sm font-medium text-[#73FFA2] transition-colors hover:text-[#66DEDB]"
          >
            ← Mis wishlists
          </Link>
        </div>
        <div className="py-10 text-center text-zinc-500">
          <p className="text-lg text-zinc-300">No tienes productos favoritos aún</p>
          <p className="mt-2 text-sm">Da me gusta a productos en el feed para agregarlos aquí</p>
        </div>
      </div>
    )
  }

  const itemsArray = Array.isArray(wishlist.items) ? wishlist.items : []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-2xl font-bold text-[#66DEDB]">Me gusta</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {itemsArray.length} producto{itemsArray.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/wishlist"
          scroll={false}
          className="shrink-0 text-sm font-medium text-[#73FFA2] transition-colors hover:text-[#66DEDB]"
        >
          ← Mis wishlists
        </Link>
      </div>

      <div className="border-t border-[#66DEDB]/25 bg-black/20 px-2 py-3 sm:px-3 sm:py-4">
        <div className="grid grid-cols-3 gap-1.5 pt-0.5 pb-0.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-5 md:gap-2 lg:grid-cols-6">
          {itemsArray.map((item) => {
            const price = item.variant?.tankuPrice
            const handle = item.product.handle
            const product = item.product as WishListDTO['items'][0]['product'] & { images?: string[] }
            const imageUrl =
              product.images && product.images.length > 0 ? product.images[0] : product.thumbnail

            const imageInner = (
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-800/80 ring-1 ring-white/10">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 480px) 32vw, 128px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[9px] text-zinc-600">—</div>
                )}
              </div>
            )

            return (
              <div key={item.id} className={CARD_CELL}>
                <div className="flex h-full flex-col rounded-lg border border-white/[0.08] bg-[#1e2229]/95 p-1 shadow-inner ring-1 ring-[#66DEDB]/15">
                  <div className="relative shrink-0 pb-px pt-0.5">
                    {handle ? (
                      <Link
                        href={`/products/${handle}`}
                        className="block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {imageInner}
                      </Link>
                    ) : (
                      imageInner
                    )}
                    <button
                      type="button"
                      title="Quitar de favoritos"
                      className="absolute right-2 top-2 z-10 rounded-full bg-black/55 px-px py-px text-zinc-200 ring-1 ring-white/15 transition-colors hover:bg-black/75"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void handleRemoveItem(item.id)
                      }}
                    >
                      <span className="sr-only">Quitar</span>
                      <span className="flex h-4 w-4 items-center justify-center text-[10px] font-semibold leading-none">
                        ×
                      </span>
                    </button>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col px-0.5 pt-1">
                    <div className="min-w-0">
                      <h4
                        className="line-clamp-2 text-left text-[10px] font-medium leading-snug text-zinc-100 sm:text-[11px]"
                        title={item.product.title}
                      >
                        {item.product.title}
                      </h4>
                      {price !== undefined && price > 0 && (
                        <p className="mt-0.5 text-left text-[10px] font-semibold tabular-nums text-[#66DEDB] sm:text-[11px]">
                          {formatCop(price)}
                        </p>
                      )}
                    </div>
                    <div className="mt-auto flex shrink-0 justify-center px-0.5 pb-2 pt-2">
                      <div
                        className="flex items-center justify-center gap-2 rounded-full px-2 py-1 sm:gap-2.5 sm:px-2.5 sm:py-1.5"
                        style={{ backgroundColor: '#2C3137' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="rounded-full p-0.5 transition-opacity hover:opacity-85 sm:p-1"
                          title="Agregar al carrito"
                          disabled={cartLoadingId === item.id}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            void handleAddToCart(item)
                          }}
                        >
                          {cartLoadingId === item.id ? (
                            <span className="flex h-4 w-4 items-center justify-center sm:h-5 sm:w-5">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent sm:h-3.5 sm:w-3.5" />
                            </span>
                          ) : (
                            <Image
                              src="/icons_tanku/tanku_agregar_a_cart_azul.svg"
                              alt=""
                              width={20}
                              height={20}
                              className="h-4 w-4 object-contain sm:h-[1.15rem] sm:w-[1.15rem]"
                              unoptimized
                            />
                          )}
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-0.5 transition-opacity hover:opacity-85 sm:p-1"
                          title="Agregar a wishlist"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openWishlistSelector(item)
                          }}
                        >
                          <Image
                            src="/icons_tanku/tanku_agregar_a_whislist_azul.svg"
                            alt=""
                            width={20}
                            height={20}
                            className="h-4 w-4 object-contain sm:h-[1.15rem] sm:w-[1.15rem]"
                            unoptimized
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedProductId ? (
        <WishlistSelectorModal
          isOpen={isWishlistModalOpen}
          onClose={closeWishlistSelector}
          productId={selectedProductId}
          variantId={selectedVariantId}
          onAdded={closeWishlistSelector}
        />
      ) : null}
    </div>
  )
}
