// Normalizar URL: quitar barra final si existe
const normalizeUrl = (url: string): string => {
  return url.replace(/\/$/, '')
}

const API_BASE = normalizeUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000')

export const API_ENDPOINTS = {
  EMAIL: {
    TEST: `${API_BASE}/api/v1/email/test`,
  },
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
    AUTH: {
      LOGIN: `${API_BASE}/api/v1/admin/auth/login`,
      ME: `${API_BASE}/api/v1/admin/auth/me`,
    },
    USERS: {
      LIST: `${API_BASE}/api/v1/admin/users`,
      BY_ID: (id: string) => `${API_BASE}/api/v1/admin/users/${id}`,
      CREATE: `${API_BASE}/api/v1/admin/users`,
      UPDATE: (id: string) => `${API_BASE}/api/v1/admin/users/${id}`,
      DELETE: (id: string) => `${API_BASE}/api/v1/admin/users/${id}`,
    },
    PRODUCTS: {
      LIST: `${API_BASE}/api/v1/admin/products`,
      BY_ID: (id: string) => `${API_BASE}/api/v1/admin/products/${id}`,
      UPDATE: (id: string) => `${API_BASE}/api/v1/admin/products/${id}`,
      TOGGLE_ACTIVE: (id: string) => `${API_BASE}/api/v1/admin/products/${id}/toggle-active`,
      REORDER_IMAGES: (id: string) => `${API_BASE}/api/v1/admin/products/${id}/reorder-images`,
      UPDATE_VARIANT_TITLE: (productId: string, variantId: string) => `${API_BASE}/api/v1/admin/products/${productId}/variants/${variantId}/title`,
      LOCK: (id: string) => `${API_BASE}/api/v1/admin/products/${id}/lock`,
      UNLOCK: (id: string) => `${API_BASE}/api/v1/admin/products/${id}/unlock`,
      LOCK_INFO: (id: string) => `${API_BASE}/api/v1/admin/products/${id}/lock-info`,
      UPLOAD_IMAGE: (id: string) => `${API_BASE}/api/v1/admin/products/${id}/images`,
      DELETE_IMAGE: (id: string) => `${API_BASE}/api/v1/admin/products/${id}/images`,
      HIDE_IMAGE: (id: string) => `${API_BASE}/api/v1/admin/products/${id}/images/hide`,
      BULK_UPDATE_CATEGORY: `${API_BASE}/api/v1/admin/products/bulk/update-category`,
      BULK_APPLY_PRICE_FORMULA: `${API_BASE}/api/v1/admin/products/bulk/apply-price-formula`,
      BULK_TOGGLE_ACTIVE: `${API_BASE}/api/v1/admin/products/bulk/toggle-active`,
      BULK_TOGGLE_LOCK: `${API_BASE}/api/v1/admin/products/bulk/toggle-lock`,
      SHOW_IMAGE: (id: string) => `${API_BASE}/api/v1/admin/products/${id}/images/show`,
      APPLY_PRICE_FORMULA: (id: string) => `${API_BASE}/api/v1/admin/products/${id}/apply-price-formula`,
    },
    FEED_GLOBAL_ACCOUNTS: {
      LIST: `${API_BASE}/api/v1/admin/feed-global-accounts`,
      CREATE: `${API_BASE}/api/v1/admin/feed-global-accounts`,
      UPDATE: (id: string) => `${API_BASE}/api/v1/admin/feed-global-accounts/${id}`,
    },
    PRICE_FORMULAS: {
      LIST: `${API_BASE}/api/v1/admin/price-formulas`,
      BY_ID: (id: string) => `${API_BASE}/api/v1/admin/price-formulas/${id}`,
      CREATE: `${API_BASE}/api/v1/admin/price-formulas`,
      UPDATE: (id: string) => `${API_BASE}/api/v1/admin/price-formulas/${id}`,
      DELETE: (id: string) => `${API_BASE}/api/v1/admin/price-formulas/${id}`,
    },
    CATEGORIES: {
      LIST: `${API_BASE}/api/v1/admin/categories`,
      BY_ID: (id: string) => `${API_BASE}/api/v1/admin/categories/${id}`,
      CREATE: `${API_BASE}/api/v1/admin/categories`,
      UPDATE: (id: string) => `${API_BASE}/api/v1/admin/categories/${id}`,
      DELETE: (id: string) => `${API_BASE}/api/v1/admin/categories/${id}`,
      TOGGLE_BLOCK: (id: string) => `${API_BASE}/api/v1/admin/categories/${id}/block`,
      UPLOAD_IMAGE: (id: string) => `${API_BASE}/api/v1/admin/categories/${id}/image`,
      DELETE_IMAGE: (id: string) => `${API_BASE}/api/v1/admin/categories/${id}/image`,
      SET_DEFAULT_FORMULA: (id: string) => `${API_BASE}/api/v1/admin/categories/${id}/default-formula`,
    },
    SUPPORT_CASES: {
      LIST: `${API_BASE}/api/v1/admin/support-cases`,
      BY_ID: (id: string) => `${API_BASE}/api/v1/admin/support-cases/${id}`,
      TAKE: (id: string) => `${API_BASE}/api/v1/admin/support-cases/${id}/take`,
      START_REVIEW: (id: string) => `${API_BASE}/api/v1/admin/support-cases/${id}/start-review`,
      WAIT_FOR_USER: (id: string) => `${API_BASE}/api/v1/admin/support-cases/${id}/wait-for-user`,
      MESSAGES: (id: string) => `${API_BASE}/api/v1/admin/support-cases/${id}/messages`,
      NOTES: (id: string) => `${API_BASE}/api/v1/admin/support-cases/${id}/notes`,
      RESOLVE: (id: string) => `${API_BASE}/api/v1/admin/support-cases/${id}/resolve`,
      CLOSE: (id: string) => `${API_BASE}/api/v1/admin/support-cases/${id}/close`,
      DROPI_PREVIEW: (id: string, orderItemId?: string) =>
        orderItemId
          ? `${API_BASE}/api/v1/admin/support-cases/${id}/dropi-preview?orderItemId=${encodeURIComponent(orderItemId)}`
          : `${API_BASE}/api/v1/admin/support-cases/${id}/dropi-preview`,
      DROPI_REFRESH: (id: string) => `${API_BASE}/api/v1/admin/support-cases/${id}/dropi-refresh`,
      UPDATE_STATUS: (id: string) => `${API_BASE}/api/v1/admin/support-cases/${id}/status`,
    },
    SYSTEM: {
      PROXY_STATUS: `${API_BASE}/api/v1/admin/system/proxy/status`,
      CRON_STATUS: `${API_BASE}/api/v1/admin/system/cron/status`,
      CRON_DROPI_SYNC_STOCK_CONFIG: `${API_BASE}/api/v1/admin/system/cron/dropi-sync-stock/config`,
      CRON_DROPI_SYNC_STOCK_RUN: `${API_BASE}/api/v1/admin/system/cron/dropi-sync-stock/run`,
      CRON_RUN_EVENT_REMINDERS: `${API_BASE}/api/v1/admin/system/cron/event-reminders/run`,
      CRON_RUN_SUPPORT_EVIDENCE_RETENTION: `${API_BASE}/api/v1/admin/system/cron/support-case-evidence-retention/run`,
      NOTIFICATIONS_TEST: `${API_BASE}/api/v1/admin/system/notifications/test`,
      EMAIL_GIFT_PREVIEW: `${API_BASE}/api/v1/admin/system/email/gift-preview`,
      EMAIL_GIFT_PREVIEW_RENDER: `${API_BASE}/api/v1/admin/system/email/gift-preview/render`,
      SUPPORT_CASES_CONFIG: `${API_BASE}/api/v1/admin/system/support-cases/config`,
    },
  },
} as const

