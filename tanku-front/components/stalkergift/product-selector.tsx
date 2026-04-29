'use client'

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import Image from 'next/image'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { ReceiverData } from '@/components/stalkergift/receiver-selector'
import {
  fetchFeedFirstProducts,
  fetchFeedSearchProductsPage,
} from '@/components/stalkergift/stalkergift-product-feed-utils'
import { FriendsPageSearchBar } from '@/components/friends/friends-page-search-bar'
import type { FeedItem } from '@/lib/types/feed.types'
import type { ProductDTO } from '@/types/api'

export interface ModalProductSearchBind {
  query: string
  onQueryChange: (value: string) => void
}

interface ProductSelectorProps {
  receiver: ReceiverData | null
  product: ProductDTO | null
  variantId: string | null
  onSelect: (product: ProductDTO, variantId: string | null) => void
  /** Top del feed precargado por el modal para acelerar 1 -> 2. */
  prefetchedTopFeed?: FeedItem[] | null
  /** Si viene del modal StalkerGift: barra fuera del scroll (junto al título del paso). */
  modalSearch?: ModalProductSearchBind
}

/** Backend devuelve `{ wishlists, canViewPrivate }` o legacy array. Privacidad ya filtrada en servidor. */
function normalizeWishlistsPayload(data: unknown): any[] {
  if (data == null) return []
  if (Array.isArray(data)) return data
  if (
    typeof data === 'object' &&
    data !== null &&
    'wishlists' in data &&
    Array.isArray((data as { wishlists: unknown }).wishlists)
  ) {
    return (data as { wishlists: any[] }).wishlists
  }
  return []
}

function mapWishlistApiProductToDTO(prod: any): ProductDTO | null {
  if (!prod?.id) return null
  return {
    id: prod.id,
    title: prod.title,
    handle: prod.handle,
    description: prod.description || undefined,
    images:
      prod.images && Array.isArray(prod.images) && prod.images.length > 0
        ? prod.images
        : prod.thumbnail
          ? [prod.thumbnail]
          : [],
    category: prod.category || undefined,
    variants:
      prod.variants && Array.isArray(prod.variants)
        ? prod.variants.map((v: any) => ({
            id: v.id,
            sku: v.sku,
            title: v.title,
            tankuPrice: v.tankuPrice || 0,
            stock: v.stock || 0,
            active: v.active !== false,
          }))
        : [],
    active: prod.active !== false,
  }
}

function mergeProductsFromWishlists(wishlists: any[]): ProductDTO[] {
  const seen = new Set<string>()
  const out: ProductDTO[] = []
  for (const w of wishlists) {
    for (const item of w.items || []) {
      const dto = mapWishlistApiProductToDTO(item.product)
      if (!dto || seen.has(dto.id)) continue
      seen.add(dto.id)
      out.push(dto)
    }
  }
  return out.sort((a, b) =>
    (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base' }),
  )
}

/** Etiquetas de sección tipo checkout (solo color StalkerGift en lista de deseos). */
function SectionLabel({
  children,
  tone = 'orange',
}: {
  children: ReactNode
  tone?: 'orange' | 'teal'
}) {
  const toneClass =
    tone === 'orange' ? 'text-[#FE9600]' : 'text-[#66DEDB]'
  return (
    <p className={`mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneClass}`}>{children}</p>
  )
}

export function ProductSelector({
  receiver,
  product,
  variantId: _variantId,
  onSelect,
  prefetchedTopFeed,
  modalSearch,
}: ProductSelectorProps) {
  const [wishlistProducts, setWishlistProducts] = useState<ProductDTO[]>([])
  const [topFeedItems, setTopFeedItems] = useState<FeedItem[] | null>(null)
  const [bootstrapLoading, setBootstrapLoading] = useState(true)

  const [internalSearch, setInternalSearch] = useState('')
  const searchInput = modalSearch ? modalSearch.query : internalSearch
  const setSearchInput = (v: string) => {
    if (modalSearch) modalSearch.onQueryChange(v)
    else setInternalSearch(v)
  }
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [searchItems, setSearchItems] = useState<FeedItem[]>([])
  const [searchCursor, setSearchCursor] = useState<string | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchLoadingMore, setSearchLoadingMore] = useState(false)

  const [pickingProductId, setPickingProductId] = useState<string | null>(null)

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 450)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchInput])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!receiver?.user?.id) {
        setWishlistProducts([])
        setTopFeedItems(prefetchedTopFeed ?? null)
        setBootstrapLoading(false)
        return
      }

      setBootstrapLoading(true)
      setTopFeedItems(prefetchedTopFeed ?? null)

      try {
        const wlPromise = apiClient.get<unknown>(
          API_ENDPOINTS.WISHLISTS.BY_USER(receiver.user.id),
        )
        const topPromise = prefetchedTopFeed
          ? Promise.resolve(prefetchedTopFeed)
          : fetchFeedFirstProducts(30, 2).catch(() => [])
        const [wlRes, top] = await Promise.all([wlPromise, topPromise])
        if (cancelled) return

        const lists = wlRes.success
          ? normalizeWishlistsPayload((wlRes as { data?: unknown }).data)
          : []
        const merged = mergeProductsFromWishlists(lists)
        const wishIds = new Set(merged.map((p) => p.id))
        setWishlistProducts(merged)

        const topDedup = top.filter((item) => !wishIds.has(item.id))

        /** Con wishlist: sección lista + Popular (sin repetir IDs). Sin wishlist: solo top como antes. */
        setTopFeedItems(merged.length > 0 ? topDedup : top)
      } catch (e) {
        console.warn('[StalkerGift] cargar wishlists / feed top', e)
        if (!cancelled) {
          setWishlistProducts([])
          if (!prefetchedTopFeed) {
            try {
              const top = await fetchFeedFirstProducts(30, 2)
              if (!cancelled) setTopFeedItems(top)
            } catch {
              if (!cancelled) setTopFeedItems([])
            }
          }
        }
      } finally {
        if (!cancelled) setBootstrapLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [receiver?.user?.id, prefetchedTopFeed])

  const isSearchMode = debouncedSearch.length > 0

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!isSearchMode || !receiver?.user?.id) {
        setSearchItems([])
        setSearchCursor(null)
        return
      }

      setSearchLoading(true)
      setSearchCursor(null)
      try {
        const { items, nextCursor } = await fetchFeedSearchProductsPage({
          search: debouncedSearch,
          cursor: null,
        })
        if (!cancelled) {
          setSearchItems(items)
          setSearchCursor(nextCursor)
        }
      } catch {
        if (!cancelled) {
          setSearchItems([])
          setSearchCursor(null)
        }
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [debouncedSearch, isSearchMode, receiver?.user?.id])

  const loadMoreSearch = useCallback(async () => {
    if (!searchCursor || searchLoadingMore || !isSearchMode) return
    setSearchLoadingMore(true)
    try {
      const { items, nextCursor } = await fetchFeedSearchProductsPage({
        search: debouncedSearch,
        cursor: searchCursor,
      })
      setSearchItems((prev) => {
        const ids = new Set(prev.map((i) => i.id))
        const extra = items.filter((i) => !ids.has(i.id))
        return [...prev, ...extra]
      })
      setSearchCursor(nextCursor)
    } finally {
      setSearchLoadingMore(false)
    }
  }, [debouncedSearch, searchCursor, searchLoadingMore, isSearchMode])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getProductPrice = (prod: ProductDTO) => {
    if (prod.variants?.length) {
      const minVariant = prod.variants.reduce((min, v) => {
        const price = v.tankuPrice || 0
        const minPrice = min.tankuPrice || 0
        return price < minPrice && price > 0 ? v : min
      })
      return minVariant.tankuPrice || 0
    }
    return 0
  }

  const getFeedItemPrice = (item: FeedItem) => {
    if (typeof item.price === 'number' && item.price > 0) return item.price
    return 0
  }

  const handleSelectProductDTO = (prod: ProductDTO, selectedVariantId?: string) => {
    if (!prod.variants?.length) {
      onSelect(prod, null)
      return
    }
    /** Varios SKU: configurar en paso siguiente; uno solo se fija aquí */
    if (prod.variants.length > 1) {
      onSelect(prod, selectedVariantId ?? null)
      return
    }
    onSelect(prod, prod.variants[0].id)
  }

  const handleSelectFeedItem = async (item: FeedItem) => {
    const h = item.handle?.trim()
    if (!h) return
    setPickingProductId(item.id)
    try {
      const path = API_ENDPOINTS.PRODUCTS.BY_HANDLE(encodeURIComponent(h))
      const res = await apiClient.get<ProductDTO>(path)
      if (res.success && res.data) {
        handleSelectProductDTO(res.data)
      }
    } catch (e: any) {
      console.error('[StalkerGift] product by handle', e)
      alert(e?.message || 'No se pudo cargar el producto')
    } finally {
      setPickingProductId(null)
    }
  }

  const renderFeedItemCard = (item: FeedItem, keyPrefix: string) => {
    const sel = product?.id === item.id
    const busy = pickingProductId === item.id
    const price = getFeedItemPrice(item)
    return (
      <button
        key={`${keyPrefix}-${item.id}`}
        type="button"
        disabled={busy}
        onClick={() => handleSelectFeedItem(item)}
        className={`text-left transition-colors ${
          sel
            ? 'rounded-xl border-2 border-[#FE9600] bg-[#FE9600]/15 p-2'
            : 'rounded-xl border border-white/10 bg-black/15 p-2 hover:bg-white/5'
        }`}
      >
        <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-lg bg-zinc-800">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt="" fill className="object-cover" unoptimized />
          ) : null}
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FE9600] border-t-transparent" />
            </div>
          ) : null}
        </div>
        <p className="line-clamp-2 text-xs font-medium text-white">{item.title}</p>
        {price > 0 ? (
          <p className="mt-1 text-xs font-semibold text-[#66DEDB]">{formatPrice(price)}</p>
        ) : null}
      </button>
    )
  }

  const renderProductDtoCard = (prod: ProductDTO, keyPrefix: string) => {
    const sel = product?.id === prod.id
    const productPrice = getProductPrice(prod)
    const img = prod.images?.[0]
    return (
      <button
        key={`${keyPrefix}-${prod.id}`}
        type="button"
        onClick={() => handleSelectProductDTO(prod)}
        className={`text-left transition-colors ${
          sel
            ? 'rounded-xl border-2 border-[#FE9600] bg-[#FE9600]/15 p-2'
            : 'rounded-xl border border-white/10 bg-black/15 p-2 hover:bg-white/5'
        }`}
      >
        {img ? (
          <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-lg bg-zinc-800">
            <Image src={img} alt="" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="mb-2 aspect-square w-full rounded-lg bg-zinc-800" />
        )}
        <p className="line-clamp-2 text-xs font-medium text-white">{prod.title}</p>
        {prod.variants && prod.variants.length > 0 ? (
          <p className="text-[10px] text-zinc-500">
            {prod.variants.length} variante{prod.variants.length > 1 ? 's' : ''}
          </p>
        ) : null}
        <p className="mt-1 text-xs font-semibold text-[#66DEDB]">{formatPrice(productPrice)}</p>
      </button>
    )
  }

  if (!receiver?.user) {
    return (
      <div className="py-12 text-center text-gray-400">
        Primero elige a quién va dirigido el regalo.
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {!modalSearch ? (
        <div className="sticky top-0 z-[5] -mx-6 mb-5 border-b border-white/[0.08] bg-[#121212]/95 px-6 pb-4 pt-0 backdrop-blur-md supports-[backdrop-filter]:bg-[#121212]/85">
          <FriendsPageSearchBar
            searchQuery={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Busca el regalo ideal…"
          />
        </div>
      ) : null}

      <div className="space-y-8 pb-2">
        {isSearchMode ? (
          <div className="space-y-3">
            {searchLoading ? (
              <div className="flex flex-col items-center py-12">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#FE9600] border-t-transparent" />
                <p className="text-sm text-zinc-400">Buscando…</p>
              </div>
            ) : searchItems.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">No hay productos para esta búsqueda.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {searchItems.map((item) => renderFeedItemCard(item, 'search'))}
                </div>
                {searchCursor ? (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      disabled={searchLoadingMore}
                      onClick={loadMoreSearch}
                      className="rounded-full border border-[#FE9600]/50 px-4 py-2 text-sm text-[#FE9600] transition hover:bg-[#FE9600]/10 disabled:opacity-50"
                    >
                      {searchLoadingMore ? 'Cargando…' : 'Cargar más resultados'}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : bootstrapLoading ? (
          <div className="flex flex-col items-center py-12">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#FE9600] border-t-transparent" />
            <p className="text-sm text-zinc-400">Cargando…</p>
          </div>
        ) : (
          <>
            {wishlistProducts.length > 0 ? (
              <section>
                <SectionLabel tone="orange">Lista de deseos</SectionLabel>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {wishlistProducts.map((prod) => renderProductDtoCard(prod, 'wl'))}
                </div>
              </section>
            ) : null}

            {topFeedItems && topFeedItems.length > 0 ? (
              <section className={wishlistProducts.length > 0 ? 'pt-2' : ''}>
                {wishlistProducts.length > 0 ? (
                  <SectionLabel tone="teal">Popular en Tanku</SectionLabel>
                ) : (
                  <p className="mb-3 text-center text-xs text-zinc-500">
                    Sugerencias del catálogo (no hay productos visibles en sus listas)
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {topFeedItems.map((item) => renderFeedItemCard(item, 'top'))}
                </div>
              </section>
            ) : null}

            {!wishlistProducts.length && (!topFeedItems || topFeedItems.length === 0) ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                No pudimos cargar listas ni el catálogo. Prueba el buscador.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
