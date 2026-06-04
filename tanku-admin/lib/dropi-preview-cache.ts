import type { SupportCaseDropiPreview } from '@/lib/types/support-cases'
import { DROPI_PREVIEW_CACHE_TTL_MS } from '@/lib/dropi-preview-parse'

type CacheEntry = {
  data: SupportCaseDropiPreview
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

function cacheKey(caseId: string, orderItemId: string) {
  return `${caseId}:${orderItemId}`
}

export function getCachedDropiPreview(
  caseId: string,
  orderItemId: string
): SupportCaseDropiPreview | null {
  const entry = cache.get(cacheKey(caseId, orderItemId))
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > DROPI_PREVIEW_CACHE_TTL_MS) {
    cache.delete(cacheKey(caseId, orderItemId))
    return null
  }
  return entry.data
}

export function setCachedDropiPreview(
  caseId: string,
  orderItemId: string,
  data: SupportCaseDropiPreview
) {
  cache.set(cacheKey(caseId, orderItemId), { data, fetchedAt: Date.now() })
}

export function dropiPreviewCacheAgeMs(caseId: string, orderItemId: string): number | null {
  const entry = cache.get(cacheKey(caseId, orderItemId))
  if (!entry) return null
  return Date.now() - entry.fetchedAt
}
