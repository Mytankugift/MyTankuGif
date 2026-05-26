import type { SyncStockJobMetadata } from '@/components/workers/SyncStockJobProgress'

const HIGHLIGHTS: Array<{
  step: keyof SyncStockJobMetadata['steps']
  key: string
  label: string
}> = [
  { step: 'raw', key: 'productosProcesados', label: 'Productos Dropi' },
  { step: 'normalize', key: 'normalizados', label: 'Normalizados' },
  { step: 'normalize', key: 'erroresAcumulado', label: 'Errores normalize' },
  { step: 'sync', key: 'variantesActualizadas', label: 'Variantes actualizadas' },
  { step: 'sync', key: 'lotes', label: 'Lotes backend' },
  { step: 'status', key: 'incluidosConStockRanking', label: 'En ranking' },
  { step: 'status', key: 'variantesInactivadas', label: 'Variantes inactivas' },
]

export function getSyncStockHighlightStats(
  metadata: SyncStockJobMetadata | null | undefined
): Array<{ label: string; value: string }> {
  if (!metadata?.steps) return []

  const out: Array<{ label: string; value: string }> = []
  for (const { step, key, label } of HIGHLIGHTS) {
    const raw = metadata.steps[step]?.stats?.[key]
    if (raw === undefined || raw === null) continue
    out.push({ label, value: String(raw) })
  }
  return out
}
