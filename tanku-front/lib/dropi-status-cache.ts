import type { DropiStatusPreview } from '@/lib/dropi-preview-parse'
import { DROPI_PREVIEW_CACHE_TTL_MS } from '@/lib/dropi-preview-parse'

type CacheEntry = { data: DropiStatusPreview; fetchedAt: number }

const cache = new Map<string, CacheEntry>()

export function getCachedDropiStatus(orderItemId: string): DropiStatusPreview | null {
  const entry = cache.get(orderItemId)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > DROPI_PREVIEW_CACHE_TTL_MS) {
    cache.delete(orderItemId)
    return null
  }
  return entry.data
}

export function setCachedDropiStatus(orderItemId: string, data: DropiStatusPreview) {
  cache.set(orderItemId, { data, fetchedAt: Date.now() })
}

export function dropiStatusCacheHint(orderItemId: string): string | null {
  const entry = cache.get(orderItemId)
  if (!entry) return null
  const min = Math.floor((Date.now() - entry.fetchedAt) / 60000)
  if (min < 1) return 'Actualizado hace menos de 1 min'
  return `Actualizado hace ${min} min`
}
