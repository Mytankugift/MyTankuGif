export const DROPI_ORDERS_DASHBOARD_URL = 'https://app.dropi.co/dashboard/orders'
export const DROPI_PROVIDERS_DASHBOARD_URL = 'https://app.dropi.co/dashboard/providers'
export const DROPI_PRODUCT_DETAILS_BASE = 'https://app.dropi.co/dashboard/product-details'

/**
 * Slug de catálogo Dropi: el handle de Tanku suele terminar en `-{dropiId}`.
 */
export function dropiProductSlugFromHandle(handle: string, dropiId: number): string {
  const trimmed = handle.trim()
  const suffix = `-${dropiId}`
  if (trimmed.endsWith(suffix)) {
    return trimmed.slice(0, -suffix.length)
  }
  return trimmed
}

/** Deep link al detalle del producto en app.dropi.co (requiere sesión Dropi). */
export function dropiProductDashboardUrl(dropiId: number, handle: string): string {
  const slug = dropiProductSlugFromHandle(handle, dropiId)
  return `${DROPI_PRODUCT_DETAILS_BASE}/${dropiId}/${encodeURI(slug)}`
}

export function resolveDropiIdFromProduct(
  dropiId: number | null | undefined,
  handle: string
): number | null {
  if (dropiId != null && Number.isFinite(dropiId) && dropiId > 0) {
    return dropiId
  }
  const match = handle.trim().match(/-(\d+)$/)
  if (!match) return null
  const parsed = parseInt(match[1], 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function dropiProviderDashboardUrl(supplierId: number | string): string {
  return `${DROPI_PROVIDERS_DASHBOARD_URL}?search=${encodeURIComponent(String(supplierId))}`
}

/**
 * Copia el ID de orden Dropi y abre el panel de órdenes.
 * Dropi no expone deep link al buscador; el usuario debe pegar en "Buscar...".
 */
export async function copyDropiOrderIdAndOpenDashboard(dropiOrderId: number): Promise<void> {
  const idText = String(dropiOrderId)
  await navigator.clipboard.writeText(idText)
  window.open(DROPI_ORDERS_DASHBOARD_URL, '_blank', 'noopener,noreferrer')
}
