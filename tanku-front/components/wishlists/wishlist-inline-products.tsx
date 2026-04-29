'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useToast } from '@/lib/contexts/toast-context'
import { GiftEligibilityMessageModal } from '@/components/gifts/gift-eligibility-message-modal'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import {
  getWishlistTwoRowCapacityPx,
  useWishlistTwoRowCapacity,
} from '@/lib/hooks/use-wishlist-two-row-capacity'
import type { WishListDTO } from '@/types/api'

interface WishlistInlineProductsProps {
  wishlist: WishListDTO
  onRemoveItem: (wishlistId: string, itemId: string) => Promise<void>
  /** Listas guardadas / perfil ajeno: no mostrar × en las mini cartas */
  hideRemoveButton?: boolean
  /** Wishlists guardadas (`/wishlist?tab=saved`): solo «Regalar Tanku», sin carrito */
  hideCartButton?: boolean
}

/** Celda de rejilla: misma card horizontal y debajo si hay «ver más». */
const CARD_CELL = 'min-w-0'

function formatCop(price: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price)
}

export function WishlistInlineProducts({
  wishlist,
  onRemoveItem,
  hideRemoveButton,
  hideCartButton,
}: WishlistInlineProductsProps) {
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const { addItem } = useCartStore()
  const { error: showError, success: showSuccess } = useToast()
  const items = wishlist.items
  const n = items.length
  const twoRowCap = useWishlistTwoRowCapacity()
  const wishlistOwnerId = wishlist.userId
  const showGiftToOwner =
    Boolean(hideRemoveButton && currentUser?.id && wishlistOwnerId !== currentUser.id)

  const [giftLoadingItemId, setGiftLoadingItemId] = useState<string | null>(null)
  const [giftEligibilityMessage, setGiftEligibilityMessage] = useState<string | null>(null)
  const [comprarLoadingItemId, setComprarLoadingItemId] = useState<string | null>(null)

  const [visibleCount, setVisibleCount] = useState(() => Math.min(n, getWishlistTwoRowCapacityPx()))

  useEffect(() => {
    setVisibleCount((prev) => {
      const cap = twoRowCap
      const prevClamped = Math.min(prev, n)
      if (n <= cap) return n
      if (prevClamped <= cap) return cap
      return prevClamped
    })
  }, [n, twoRowCap])

  const handleAddToCart = useCallback(
    async (item: WishListDTO['items'][0]) => {
      const handle = item.product.handle
      if (!handle) {
        showError('Sin enlace de producto')
        return
      }
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
      }
    },
    [addItem, showError, showSuccess],
  )

  /** Wishlists propias: mismo flujo que «Comprar ahora» del modal (carrito + /cart). */
  const handleComprarTankuNow = useCallback(
    async (item: WishListDTO['items'][0]) => {
      const handle = item.product.handle
      if (!handle) {
        showError('Sin enlace de producto')
        return
      }
      setComprarLoadingItemId(item.id)
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
            router.push('/cart')
            return
          }
        }
        if (variants.length === 1) {
          await addItem(variants[0].id, 1)
          router.push('/cart')
          return
        }
        showError('Este producto tiene múltiples variantes')
      } catch {
        showError('Error al procesar compra')
      } finally {
        setComprarLoadingItemId(null)
      }
    },
    [addItem, router, showError],
  )

  const handleRegalarTanku = useCallback(
    async (item: WishListDTO['items'][0]) => {
      if (!item.variantId) {
        showError('Este producto no tiene variante seleccionada')
        return
      }
      if (!currentUser?.id) {
        router.push('/feed')
        return
      }
      setGiftLoadingItemId(item.id)
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

        const eligibility = await apiClient.get<any>(
          API_ENDPOINTS.GIFTS.RECIPIENT_ELIGIBILITY(wishlistOwnerId),
        )
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

        router.push(
          `/checkout/gift-direct?variantId=${item.variantId}&recipientId=${wishlistOwnerId}&quantity=1`,
        )
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al iniciar el regalo'
        setGiftEligibilityMessage(msg)
      } finally {
        setGiftLoadingItemId(null)
      }
    },
    [currentUser?.id, router, showError, wishlistOwnerId],
  )

  const effectiveVisible = Math.min(visibleCount, n)
  const visibleItems = items.slice(0, effectiveVisible)
  const remaining = Math.max(0, n - effectiveVisible)
  const nextChunk = remaining > 0 ? Math.min(twoRowCap, remaining) : 0

  const loadMore = () => {
    setVisibleCount((c) => Math.min(c + twoRowCap, n))
  }

  if (n === 0) {
    return (
      <div className="border-t border-[#66DEDB]/15 bg-black/15 px-3 py-6 text-center text-sm text-zinc-500 sm:px-4">
        Esta wishlist está vacía
      </div>
    )
  }

  const renderProductCard = (item: WishListDTO['items'][0]) => {
    const price = item.variant?.tankuPrice
    const handle = item.product.handle
    const img = (
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-800/80 ring-1 ring-white/10">
        {item.product.thumbnail ? (
          <Image
            src={item.product.thumbnail}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 480px) 32vw, 128px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[9px] text-zinc-600">—</div>
        )}
        {hideRemoveButton ? null : (
          <button
            type="button"
            title="Quitar de la wishlist"
            className="absolute right-1 top-1 rounded-full bg-black/55 px-px py-px text-zinc-200 ring-1 ring-white/15 transition-colors hover:bg-black/75"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void onRemoveItem(wishlist.id, item.id)
            }}
          >
            <span className="sr-only">Quitar</span>
            <span className="flex h-4 w-4 items-center justify-center text-[10px] font-semibold leading-none">×</span>
          </button>
        )}
      </div>
    )

    const body = (
      <>
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
        <div className="mt-auto flex min-h-0 w-full shrink-0 flex-col gap-1.5 px-1 pb-2 pt-1 sm:px-2 sm:pt-2">
          <div
            className={`flex items-center gap-1 ${
              showGiftToOwner && !hideCartButton ? 'justify-between' : 'justify-stretch'
            }`}
          >
            {showGiftToOwner ? (
              hideCartButton ? (
                <button
                  type="button"
                  title="Regalar Tanku a quien creó la wishlist"
                  disabled={giftLoadingItemId === item.id}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void handleRegalarTanku(item)
                  }}
                  className="w-full truncate rounded-full bg-[linear-gradient(90deg,#3B9BC3_0%,#2A5B74_100%)] px-1.5 py-1.5 text-[8px] font-semibold leading-tight text-white shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-2 sm:text-[9px]"
                >
                  {giftLoadingItemId === item.id ? '…' : 'Regalar Tanku'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="shrink-0 opacity-95 transition-opacity hover:opacity-100"
                    title="Agregar al carrito"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void handleAddToCart(item)
                    }}
                  >
                    <Image
                      src="/feed/Icons/Shopping_Cart_Green.png"
                      alt=""
                      width={16}
                      height={16}
                      className="h-4 w-4 object-contain"
                    />
                  </button>
                  <button
                    type="button"
                    title="Regalar Tanku a quien creó la wishlist"
                    disabled={giftLoadingItemId === item.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void handleRegalarTanku(item)
                    }}
                    className="min-w-0 max-w-[calc(100%-1.5rem)] flex-1 truncate rounded-full bg-[linear-gradient(90deg,#3B9BC3_0%,#2A5B74_100%)] px-1.5 py-1 text-[8px] font-semibold leading-tight text-white shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-2 sm:text-[9px]"
                  >
                    {giftLoadingItemId === item.id ? '…' : 'Regalar Tanku'}
                  </button>
                </>
              )
            ) : (
              <button
                type="button"
                title="Comprar y abrir carrito"
                disabled={comprarLoadingItemId === item.id}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  void handleComprarTankuNow(item)
                }}
                className="w-full rounded-full bg-[#73FFA2] px-1.5 py-1.5 text-[8px] font-semibold leading-tight text-gray-900 shadow-[inset_0_2px_6px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#66DEDB] disabled:cursor-not-allowed disabled:opacity-50 sm:px-2 sm:text-[9px]"
              >
                {comprarLoadingItemId === item.id ? '…' : 'Comprar TANKU'}
              </button>
            )}
          </div>
        </div>
      </>
    )

    return (
      <div key={item.id} className={CARD_CELL}>
        <div className="flex h-full flex-col rounded-lg border border-white/[0.08] bg-[#1e2229]/95 p-1 shadow-inner ring-1 ring-[#66DEDB]/15">
          {handle ? (
            <Link href={`/products/${handle}`} className="block shrink-0 pb-px pt-0.5" onClick={(e) => e.stopPropagation()}>
              {img}
            </Link>
          ) : (
            <div className="pb-px pt-0.5">{img}</div>
          )}
          <div className="flex min-h-0 flex-1 flex-col px-0.5 pt-1">{body}</div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="border-t border-[#66DEDB]/25 bg-black/20 px-2 py-3 sm:px-3 sm:py-4">
      <div className="grid grid-cols-3 gap-1.5 pt-0.5 pb-0.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-5 md:gap-2 lg:grid-cols-6">
        {visibleItems.map((item) => renderProductCard(item))}
      </div>

      {remaining > 0 ? (
        <div className="flex flex-col items-center gap-1 pt-4">
          <button
            type="button"
            onClick={loadMore}
            className="rounded-full border border-[#66DEDB]/50 bg-transparent px-6 py-2.5 text-sm font-semibold text-[#66DEDB] transition-colors hover:bg-[#66DEDB]/10"
          >
            Ver más productos
            <span className="mt-0.5 block text-center text-xs font-normal text-zinc-400">
              Siguientes {nextChunk}
              {remaining > nextChunk ? ` · ${remaining} por ver` : ''}
            </span>
          </button>
          <span className="text-center text-[11px] text-zinc-500 sm:text-xs">
            Mostrando {visibleItems.length} de {n}
          </span>
        </div>
      ) : n > twoRowCap ? (
        <p className="pt-4 text-center text-[11px] text-zinc-500 sm:text-xs">Mostrando los {n} productos</p>
      ) : null}
    </div>
    <GiftEligibilityMessageModal
      open={Boolean(giftEligibilityMessage?.trim())}
      message={giftEligibilityMessage ?? ''}
      onClose={() => setGiftEligibilityMessage(null)}
    />
    </>
  )
}
