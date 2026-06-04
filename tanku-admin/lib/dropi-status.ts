/**
 * Etiquetas unificadas para estados Dropi (inglés al crear orden, español vía webhook).
 */
const DROPI_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PENDIENTE: 'Pendiente',
  PROCESSING: 'En proceso',
  EN_PROCESO: 'En proceso',
  SHIPPED: 'Enviado',
  ENVIADO: 'Enviado',
  EN_CAMINO: 'En camino',
  DELIVERED: 'Entregado',
  ENTREGADO: 'Entregado',
  CANCELLED: 'Cancelado',
  CANCELED: 'Cancelado',
  CANCELADO: 'Cancelado',
  REJECTED: 'Rechazado',
  RECHAZADO: 'Rechazado',
  GUIA_GENERADA: 'Guía generada',
  'N/A': 'Sin estado',
}

function normalizeDropiStatusKey(status: string): string {
  return status.trim().toUpperCase().replace(/\s+/g, '_')
}

export function formatDropiStatus(status: string | null | undefined): string {
  if (!status?.trim()) return 'Sin estado'
  const key = normalizeDropiStatusKey(status)
  return DROPI_STATUS_LABELS[key] ?? status.replace(/_/g, ' ')
}

export function dropiStatusBadgeClass(status: string | null | undefined): string {
  if (!status) return 'bg-gray-100 text-gray-600'
  const key = normalizeDropiStatusKey(status)
  if (['DELIVERED', 'ENTREGADO'].includes(key)) return 'bg-green-100 text-green-800'
  if (['CANCELLED', 'CANCELED', 'CANCELADO', 'REJECTED', 'RECHAZADO'].includes(key)) {
    return 'bg-red-100 text-red-800'
  }
  if (['SHIPPED', 'ENVIADO', 'EN_CAMINO', 'GUIA_GENERADA'].includes(key)) {
    return 'bg-purple-100 text-purple-800'
  }
  if (['PENDING', 'PENDIENTE', 'PROCESSING', 'EN_PROCESO'].includes(key)) {
    return 'bg-amber-100 text-amber-800'
  }
  return 'bg-amber-100 text-amber-800'
}
