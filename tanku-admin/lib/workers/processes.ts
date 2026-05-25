/** Mapa workerId → etiqueta en nav y páginas */
export const WORKER_PROCESS_NAV: Record<string, string> = {
  'sync-raw': 'Sincronizar RAW',
  normalize: 'Normalizar',
  enrich: 'Enriquecer',
  'sync-backend': 'Sincronizar Backend',
  'sync-stock': 'Sincronizar Stock',
}

export function getWorkerNavLabel(workerId: string | undefined): string | null {
  if (!workerId) return null
  return WORKER_PROCESS_NAV[workerId] ?? null
}
