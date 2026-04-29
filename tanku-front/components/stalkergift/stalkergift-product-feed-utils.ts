import { apiClient } from '@/lib/api/client'
import type { FeedItem, FeedResponse } from '@/lib/types/feed.types'

const FEED_PATH = '/api/v1/feed'

/**
 * Primeras N tarjetas de producto del feed (orden global_ranking como en /feed).
 * Muy ligero: como máximo `maxRequests` peticiones hasta reunir suficientes productos (mezcla con posters en el mismo feed).
 */
export async function fetchFeedFirstProducts(
  maxProducts = 30,
  maxRequests = 2,
): Promise<FeedItem[]> {
  const out: FeedItem[] = []
  let cursor: string | null = null

  for (let req = 0; req < maxRequests && out.length < maxProducts; req++) {
    const headers: HeadersInit = {}
    if (cursor) headers['X-Feed-Cursor'] = cursor

    const response = await apiClient.get<FeedResponse>(FEED_PATH, headers)
    if (!response.success || !response.data?.items?.length) break

    const products = response.data.items.filter((x) => x.type === 'product')
    for (const p of products) {
      if (out.length >= maxProducts) break
      if (out.some((x) => x.id === p.id)) continue
      out.push(p)
    }

    const next =
      typeof response.data.nextCursorToken === 'string' ? response.data.nextCursorToken : null
    if (!next) break
    cursor = next
  }

  return out.slice(0, maxProducts)
}

export async function fetchFeedSearchProductsPage(params: {
  search: string
  cursor: string | null
}): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const { search, cursor } = params
  const qp = new URLSearchParams()
  const q = search.trim()
  if (q) qp.set('search', q)
  const url = qp.toString() ? `${FEED_PATH}?${qp.toString()}` : FEED_PATH

  const headers: HeadersInit = {}
  if (cursor) headers['X-Feed-Cursor'] = cursor

  const response = await apiClient.get<FeedResponse>(url, headers)
  if (!response.success || !response.data) {
    return { items: [], nextCursor: null }
  }
  const items = (response.data.items || []).filter((i) => i.type === 'product')
  const next =
    typeof response.data.nextCursorToken === 'string' ? response.data.nextCursorToken : null
  return { items, nextCursor: next }
}
