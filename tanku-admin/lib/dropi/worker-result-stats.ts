import type { SyncStockJobMetadata } from '@/components/workers/SyncStockJobProgress'
import { parseSyncStockMetadata } from '@/lib/dropi/parse-sync-stock-metadata'
import { getSyncStockHighlightStats } from '@/lib/dropi/sync-stock-summary-stats'

export interface EnrichJobResultMetadata {
  enriched?: number
  errors?: number
}

export interface SyncProductJobResultMetadata {
  productsCreated?: number
  productsUpdated?: number
  productsIncludedWithStock?: number
  productsExcludedNoStock?: number
}

function parseRecord(raw: unknown): Record<string, unknown> | null {
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
  return obj as Record<string, unknown>
}

export function parseEnrichMetadata(raw: unknown): EnrichJobResultMetadata | null {
  const rec = parseRecord(raw)
  if (!rec) return null
  if (rec.enriched === undefined && rec.errors === undefined) return null
  return rec as EnrichJobResultMetadata
}

export function parseSyncProductMetadata(raw: unknown): SyncProductJobResultMetadata | null {
  const rec = parseRecord(raw)
  if (!rec) return null
  if (
    rec.productsCreated === undefined &&
    rec.productsUpdated === undefined &&
    rec.productsIncludedWithStock === undefined &&
    rec.productsExcludedNoStock === undefined
  ) {
    return null
  }
  return rec as SyncProductJobResultMetadata
}

export function getEnrichHighlightStats(
  metadata: EnrichJobResultMetadata | null | undefined
): Array<{ label: string; value: string }> {
  if (!metadata) return []
  const out: Array<{ label: string; value: string }> = []
  if (metadata.enriched !== undefined) {
    out.push({ label: 'Enriquecidos', value: String(metadata.enriched) })
  }
  if (metadata.errors !== undefined && metadata.errors > 0) {
    out.push({ label: 'Errores', value: String(metadata.errors) })
  }
  return out
}

export function getSyncProductHighlightStats(
  metadata: SyncProductJobResultMetadata | null | undefined
): Array<{ label: string; value: string }> {
  if (!metadata) return []
  const out: Array<{ label: string; value: string }> = []
  if (metadata.productsCreated !== undefined) {
    out.push({ label: 'Productos creados', value: String(metadata.productsCreated) })
  }
  if (metadata.productsUpdated !== undefined) {
    out.push({ label: 'Productos actualizados', value: String(metadata.productsUpdated) })
  }
  if (metadata.productsIncludedWithStock !== undefined) {
    out.push({ label: 'En ranking (stock OK)', value: String(metadata.productsIncludedWithStock) })
  }
  if (metadata.productsExcludedNoStock !== undefined) {
    out.push({ label: 'Excluidos (sin stock)', value: String(metadata.productsExcludedNoStock) })
  }
  return out
}

export function getWorkerHighlightStats(
  workerId: string,
  metadata: unknown
): Array<{ label: string; value: string }> {
  if (workerId === 'sync-stock') {
    return getSyncStockHighlightStats(parseSyncStockMetadata(metadata))
  }
  if (workerId === 'enrich') {
    return getEnrichHighlightStats(parseEnrichMetadata(metadata))
  }
  if (workerId === 'sync-to-backend') {
    return getSyncProductHighlightStats(parseSyncProductMetadata(metadata))
  }
  return []
}

export type WorkerJobMetadata = SyncStockJobMetadata | EnrichJobResultMetadata | SyncProductJobResultMetadata | null
