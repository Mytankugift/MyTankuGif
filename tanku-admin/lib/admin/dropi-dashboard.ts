export const DROPI_ORDERS_DASHBOARD_URL = 'https://app.dropi.co/dashboard/orders'

/**
 * Copia el ID de orden Dropi y abre el panel de órdenes.
 * Dropi no expone deep link al buscador; el usuario debe pegar en "Buscar...".
 */
export async function copyDropiOrderIdAndOpenDashboard(dropiOrderId: number): Promise<void> {
  const idText = String(dropiOrderId)
  await navigator.clipboard.writeText(idText)
  window.open(DROPI_ORDERS_DASHBOARD_URL, '_blank', 'noopener,noreferrer')
}
