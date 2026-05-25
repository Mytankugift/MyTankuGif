import type { SyncStockJobMetadata } from '@/components/workers/SyncStockJobProgress'
import { parseSyncStockMetadata } from '@/lib/dropi/parse-sync-stock-metadata'

const STEP_KEYS = ['raw', 'normalize', 'sync', 'status'] as const

const STEP_LABELS: Record<(typeof STEP_KEYS)[number], string> = {
  raw: 'RAW Dropi',
  normalize: 'Normalizar',
  sync: 'Sync backend',
  status: 'Estados stock',
}

/** Paso en curso o siguiente pendiente para mostrar en nav / cards */
export function getSyncStockActiveStepLabel(metadata: unknown): string | null {
  const parsed = parseSyncStockMetadata(metadata)
  if (!parsed?.steps) return null

  const current = parsed.currentStep as (typeof STEP_KEYS)[number] | undefined
  if (current && STEP_LABELS[current]) {
    const st = parsed.steps[current]
    if (st?.status === 'running') return STEP_LABELS[current]
  }

  for (const key of STEP_KEYS) {
    if (parsed.steps[key]?.status === 'running') return STEP_LABELS[key]
  }

  for (const key of STEP_KEYS) {
    if (parsed.steps[key]?.status === 'pending') return STEP_LABELS[key]
  }

  return null
}

export function computeSyncStockOverallProgress(
  metadata: SyncStockJobMetadata | null | undefined
): number {
  if (!metadata?.steps) return 0
  const weights = 100 / STEP_KEYS.length
  let total = 0
  for (const key of STEP_KEYS) {
    const step = metadata.steps[key]
    if (!step) continue
    if (step.status === 'completed') {
      total += weights
    } else if (step.status === 'running') {
      total += (step.progress / 100) * weights
    }
  }
  return Math.min(100, Math.round(total))
}
