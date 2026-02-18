// Normalizar URL: quitar barra final si existe
const normalizeUrl = (url: string): string => {
  return url.replace(/\/$/, '')
}

const API_BASE = normalizeUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')

export const API_ENDPOINTS = {
  DROPI: {
    JOBS: {
      LIST: `${API_BASE}/api/v1/dropi/jobs`,
      BY_ID: (id: string) => `${API_BASE}/api/v1/dropi/jobs/${id}`,
      CREATE_RAW: `${API_BASE}/api/v1/dropi/jobs/raw`,
      CREATE_NORMALIZE: `${API_BASE}/api/v1/dropi/jobs/normalize`,
      CREATE_ENRICH: `${API_BASE}/api/v1/dropi/jobs/enrich`,
      CREATE_SYNC_PRODUCT: `${API_BASE}/api/v1/dropi/jobs/sync-product`,
      CREATE_SYNC_STOCK: `${API_BASE}/api/v1/dropi/jobs/stock`,
      CANCEL: (id: string) => `${API_BASE}/api/v1/dropi/jobs/${id}`,
    },
    SYNC_RAW: `${API_BASE}/api/v1/dropi/sync-raw`,
    NORMALIZE: `${API_BASE}/api/v1/dropi/normalize`,
    ENRICH: `${API_BASE}/api/v1/dropi/enrich`,
    SYNC_TO_BACKEND: `${API_BASE}/api/v1/dropi/sync-to-backend`,
    SYNC_STOCK: `${API_BASE}/api/v1/dropi/jobs/stock`,
  },
  ADMIN: {
    SYSTEM: {
      PROXY_STATUS: `${API_BASE}/api/v1/admin/system/proxy/status`,
    },
  },
} as const

