import type { StoryDTO } from '@/lib/hooks/use-stories'
import { apiClient } from '@/lib/api/client'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import { isAgeRestrictedApiError, type ApiErrorWithCode } from '@/lib/api/error-codes'
import { isWishlistStoryItem } from '@/lib/stories/story-viewer-timing'

export type WishlistStoryProduct = {
  id: string
  title?: string
  handle?: string
  images?: string[]
  variants?: Array<{ id: string; price?: number; tankuPrice?: number; title?: string }>
  price?: number
}

const RESOLVED_TTL_MS = 10 * 60 * 1000
const resolvedByStoryId = new Map<string, { product: WishlistStoryProduct; timestamp: number }>()
const pendingByStoryId = new Map<string, Promise<WishlistStoryProduct | null>>()
const prefetchedImageUrls = new Set<string>()

function cacheProduct(storyId: string, product: WishlistStoryProduct) {
  resolvedByStoryId.set(storyId, { product, timestamp: Date.now() })
}

export function getCachedWishlistStoryProduct(storyId: string): WishlistStoryProduct | null {
  const cached = resolvedByStoryId.get(storyId)
  if (!cached) return null
  if (Date.now() - cached.timestamp >= RESOLVED_TTL_MS) {
    resolvedByStoryId.delete(storyId)
    return null
  }
  return cached.product
}

function prefetchProductImage(product: WishlistStoryProduct, story: StoryDTO) {
  if (typeof window === 'undefined') return
  const url =
    (product.images && product.images.length > 0 ? product.images[0] : null) ||
    story.files[0]?.fileUrl
  if (!url || prefetchedImageUrls.has(url)) return
  prefetchedImageUrls.add(url)
  const img = new window.Image()
  img.src = url
}

function buildFallbackProduct(story: StoryDTO): WishlistStoryProduct | null {
  const storyImage = story.files[0]?.fileUrl
  if (!story.productId || !storyImage) return null
  return {
    id: story.productId,
    title:
      story.title ||
      story.description?.replace(' agregado a tu wishlist', '') ||
      'Producto',
    images: [storyImage],
    variants: story.variantId
      ? [{ id: story.variantId, price: 0, title: 'Variante' }]
      : [],
  }
}

/** Resuelve el producto de una historia wishlist (cache + dedupe de peticiones) */
export async function resolveWishlistStoryProduct(
  story: StoryDTO
): Promise<WishlistStoryProduct | null> {
  if (!story.productId) return null

  const cached = getCachedWishlistStoryProduct(story.id)
  if (cached) return cached

  const pending = pendingByStoryId.get(story.id)
  if (pending) return pending

  const promise = (async (): Promise<WishlistStoryProduct | null> => {
    try {
      if (story.productHandle) {
        const fullProduct = await fetchProductByHandle(story.productHandle)
        if (fullProduct) {
          cacheProduct(story.id, fullProduct as WishlistStoryProduct)
          prefetchProductImage(fullProduct as WishlistStoryProduct, story)
          return fullProduct as WishlistStoryProduct
        }
      }

      try {
        const response = await apiClient.get<{ handle?: string }>(
          `/api/v1/products/${story.productId}`
        )
        if (response.success && response.data?.handle) {
          const fullProduct = await fetchProductByHandle(response.data.handle)
          if (fullProduct) {
            cacheProduct(story.id, fullProduct as WishlistStoryProduct)
            prefetchProductImage(fullProduct as WishlistStoryProduct, story)
            return fullProduct as WishlistStoryProduct
          }
        }
      } catch {
        // fallback abajo
      }

      const fallback = buildFallbackProduct(story)
      if (fallback) {
        cacheProduct(story.id, fallback)
        prefetchProductImage(fallback, story)
        return fallback
      }

      return null
    } catch (error) {
      if (isAgeRestrictedApiError(error) && (error as ApiErrorWithCode).teaser) {
        const teaser = (error as ApiErrorWithCode).teaser! as WishlistStoryProduct
        cacheProduct(story.id, teaser)
        prefetchProductImage(teaser, story)
        return teaser
      }
      const fallback = buildFallbackProduct(story)
      if (fallback) {
        cacheProduct(story.id, fallback)
        prefetchProductImage(fallback, story)
        return fallback
      }
      return null
    } finally {
      pendingByStoryId.delete(story.id)
    }
  })()

  pendingByStoryId.set(story.id, promise)
  return promise
}

/** Precarga en segundo plano (no bloquea) */
export function prefetchWishlistStoryProduct(story: StoryDTO): void {
  if (!isWishlistStoryItem(story)) return
  void resolveWishlistStoryProduct(story)
}

export function prefetchWishlistStoryProducts(stories: StoryDTO[]): void {
  for (const story of stories) {
    prefetchWishlistStoryProduct(story)
  }
}
