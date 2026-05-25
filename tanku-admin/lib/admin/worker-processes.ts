import { API_ENDPOINTS } from '@/lib/api/endpoints'

export type WorkerProcessType =
  | 'RAW'
  | 'NORMALIZE'
  | 'ENRICH'
  | 'SYNC_PRODUCT'
  | 'SYNC_STOCK'

export interface WorkerProcessConfig {
  id: string
  name: string
  description: string
  type: WorkerProcessType
  color: string
  icon: string
  route: string
  /** Badge en el listado /workers */
  badge?: 'cron'
}

/** Workers visibles en operación diaria. */
export const WORKER_PROCESSES: WorkerProcessConfig[] = [
  {
    id: 'sync-stock',
    name: 'Sincronizar catálogo',
    description: 'Favoritos Dropi: RAW, normalizar, Tanku, stock y retiro fuera de catálogo',
    type: 'SYNC_STOCK',
    color: 'bg-indigo-500',
    icon: '📊',
    route: '/workers/sync-stock',
    badge: 'cron',
  },
  {
    id: 'enrich',
    name: 'Enriquecer',
    description: 'Descripciones e imágenes (solo productos del catálogo actual)',
    type: 'ENRICH',
    color: 'bg-yellow-500',
    icon: '✨',
    route: '/workers/enrich',
  },
]

/** Debug / soporte (no listados en /workers por defecto). */
export const WORKER_PROCESSES_DEBUG: WorkerProcessConfig[] = [
  {
    id: 'sync-raw',
    name: 'Sincronizar RAW',
    description: 'Guarda JSON crudo en DropiRawProduct (favoritos)',
    type: 'RAW',
    color: 'bg-blue-500',
    icon: '📦',
    route: '/workers/sync-raw',
  },
  {
    id: 'normalize',
    name: 'Normalizar',
    description: 'Normaliza a DropiProduct',
    type: 'NORMALIZE',
    color: 'bg-purple-500',
    icon: '🔄',
    route: '/workers/normalize',
  },
  {
    id: 'sync-to-backend',
    name: 'Sincronizar Backend',
    description: 'Sincroniza a Product/ProductVariant/WarehouseVariant',
    type: 'SYNC_PRODUCT',
    color: 'bg-green-500',
    icon: '🚀',
    route: '/workers/sync-to-backend',
  },
]

export type WorkerProcessDetail = WorkerProcessConfig & {
  endpoint: string
  steps: Array<{ name: string; key: string }>
}

export const WORKER_PROCESSES_BY_ID: Record<string, WorkerProcessDetail> = {
  'sync-stock': {
    ...WORKER_PROCESSES.find((p) => p.id === 'sync-stock')!,
    endpoint: API_ENDPOINTS.DROPI.SYNC_STOCK,
    steps: [
      { name: 'Favoritos Dropi (RAW)', key: 'raw' },
      { name: 'Normalizar y retiro', key: 'normalize' },
      { name: 'Catálogo Tanku', key: 'sync' },
      { name: 'Stock y ranking', key: 'status' },
    ],
  },
  'sync-raw': {
    ...WORKER_PROCESSES.find((p) => p.id === 'sync-raw')!,
    endpoint: API_ENDPOINTS.DROPI.SYNC_RAW,
    steps: [{ name: 'Sincronizando productos RAW', key: 'raw' }],
  },
  normalize: {
    ...WORKER_PROCESSES.find((p) => p.id === 'normalize')!,
    endpoint: API_ENDPOINTS.DROPI.NORMALIZE,
    steps: [{ name: 'Normalizando productos', key: 'normalize' }],
  },
  enrich: {
    ...WORKER_PROCESSES.find((p) => p.id === 'enrich')!,
    endpoint: API_ENDPOINTS.DROPI.ENRICH,
    steps: [{ name: 'Enriqueciendo productos', key: 'enrich' }],
  },
  'sync-to-backend': {
    ...WORKER_PROCESSES.find((p) => p.id === 'sync-to-backend')!,
    endpoint: API_ENDPOINTS.DROPI.SYNC_TO_BACKEND,
    steps: [{ name: 'Sincronizando al backend', key: 'sync' }],
  },
}

const WORKER_ID_ALIASES: Record<string, string> = {
  'sync-backend': 'sync-to-backend',
}

export function getWorkerProcess(workerId: string): WorkerProcessDetail | null {
  const id = WORKER_ID_ALIASES[workerId] ?? workerId
  return WORKER_PROCESSES_BY_ID[id] ?? null
}
