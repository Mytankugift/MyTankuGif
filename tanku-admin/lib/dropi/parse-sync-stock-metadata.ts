import type { SyncStockJobMetadata } from '@/components/workers/SyncStockJobProgress'

export function parseSyncStockMetadata(raw: unknown): SyncStockJobMetadata | null {
  if (raw == null) return null
  let obj: unknown = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof obj !== 'object' || obj === null) return null
  const candidate = obj as SyncStockJobMetadata
  if (!candidate.steps || typeof candidate.steps !== 'object') return null
  return candidate
}
