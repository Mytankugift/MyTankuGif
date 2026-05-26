/** Pasos del job SYNC_STOCK (4 fases en UI) */
export const SYNC_STOCK_STEP_KEYS = ['raw', 'normalize', 'sync', 'status'] as const;
export type SyncStockStepKey = (typeof SYNC_STOCK_STEP_KEYS)[number];

export type StepRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SyncStockStepState {
  status: StepRunStatus;
  progress: number;
  stats: Record<string, unknown>;
  message?: string;
}

export interface SyncStockJobMetadata {
  currentStep: SyncStockStepKey | 'done';
  steps: Record<SyncStockStepKey, SyncStockStepState>;
  /** Manual en admin: paso sync con skipExisting=false (descripción, imágenes, etc.). Cron siempre false. */
  propagateProductFicha?: boolean;
  /** Tras terminar: encolar ENRICH si hay pendientes (no bloquea el cron de sync-stock). */
  chainEnrichOnComplete?: boolean;
  source?: 'cron' | 'manual';
}

export function createInitialSyncStockMetadata(
  options?: Pick<
    SyncStockJobMetadata,
    'propagateProductFicha' | 'chainEnrichOnComplete' | 'source'
  >
): SyncStockJobMetadata {
  const steps = {} as Record<SyncStockStepKey, SyncStockStepState>;
  for (const key of SYNC_STOCK_STEP_KEYS) {
    steps[key] = { status: 'pending', progress: 0, stats: {} };
  }
  return {
    currentStep: 'raw',
    steps,
    propagateProductFicha: options?.propagateProductFicha ?? false,
    chainEnrichOnComplete: options?.chainEnrichOnComplete ?? true,
    source: options?.source ?? 'manual',
  };
}

export function computeOverallProgress(metadata: SyncStockJobMetadata): number {
  const weights = 100 / SYNC_STOCK_STEP_KEYS.length;
  let total = 0;
  for (const key of SYNC_STOCK_STEP_KEYS) {
    const step = metadata.steps[key];
    if (step.status === 'completed') {
      total += weights;
    } else if (step.status === 'running') {
      total += (step.progress / 100) * weights;
    }
  }
  return Math.min(100, Math.round(total));
}
