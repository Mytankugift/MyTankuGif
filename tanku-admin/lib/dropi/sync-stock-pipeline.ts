export interface SyncStockPipelineEnrichFollowUp {
  enqueued?: boolean
  jobId?: string
  pendingCount?: number
  reason?: string
}

export interface SyncStockPipelineSyncProductFollowUp {
  enqueued?: boolean
  jobId?: string
  reason?: string
}

export interface SyncStockPipelineFollowUp {
  enrich?: SyncStockPipelineEnrichFollowUp
  syncProduct?: SyncStockPipelineSyncProductFollowUp
}

export interface SyncStockJobMetadataWithPipeline {
  currentStep?: string
  steps?: Record<string, unknown>
  chainEnrichOnComplete?: boolean
  pipeline?: SyncStockPipelineFollowUp
}

export function getPipelineEnrichMessage(
  enrich: SyncStockPipelineEnrichFollowUp | undefined,
  chainEnabled: boolean
): { title: string; detail: string; tone: 'success' | 'info' | 'muted' | 'warning' } {
  if (chainEnabled === false) {
    return {
      title: 'Enrich automático desactivado',
      detail: 'Esta ejecución no encoló enrich (opción desmarcada al ejecutar).',
      tone: 'muted',
    }
  }
  if (!enrich) {
    return {
      title: 'Pipeline posterior',
      detail: 'Sin datos de encadenado (job anterior a esta función).',
      tone: 'muted',
    }
  }
  if (enrich.enqueued && enrich.jobId) {
    const n = enrich.pendingCount ?? 0
    return {
      title: 'Enrich encolado',
      detail: `${n} producto(s) pendiente(s) · Job ${enrich.jobId}`,
      tone: 'success',
    }
  }
  if (enrich.jobId && enrich.reason?.includes('ENRICH ya activo')) {
    return {
      title: 'Enrich ya en curso',
      detail: `${enrich.pendingCount ?? 0} pendiente(s) se procesan en el job activo · ${enrich.jobId}`,
      tone: 'info',
    }
  }
  if (enrich.reason?.includes('sin productos pendientes')) {
    return {
      title: 'Enrich no necesario',
      detail: 'No hay productos nuevos sin descripción e imágenes en el catálogo.',
      tone: 'muted',
    }
  }
  return {
    title: 'Enrich no encolado',
    detail: enrich.reason ?? 'Sin detalle',
    tone: 'warning',
  }
}

export function getPipelineSyncProductMessage(
  syncProduct: SyncStockPipelineSyncProductFollowUp | undefined
): { title: string; detail: string; tone: 'success' | 'info' | 'muted' | 'warning' } | null {
  if (!syncProduct) return null
  if (syncProduct.enqueued && syncProduct.jobId) {
    return {
      title: 'Propagar a Tanku encolado',
      detail: `Tras enrich · Job ${syncProduct.jobId}`,
      tone: 'success',
    }
  }
  if (syncProduct.reason) {
    return {
      title: 'Propagar a Tanku no encolado',
      detail: syncProduct.reason,
      tone: syncProduct.reason.includes('ningún producto') ? 'muted' : 'warning',
    }
  }
  return null
}
