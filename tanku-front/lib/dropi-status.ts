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
  if (!status?.trim()) return 'Sin actualizar'
  const key = normalizeDropiStatusKey(status)
  return DROPI_STATUS_LABELS[key] ?? status.replace(/_/g, ' ')
}

export function dropiStatusChipClass(status: string | null | undefined): string {
  if (!status) return 'bg-gray-900/30 text-gray-400 border-gray-500/30'
  const key = normalizeDropiStatusKey(status)
  if (['PENDING', 'PENDIENTE'].includes(key)) {
    return 'bg-yellow-900/20 text-yellow-400 border-yellow-400/30'
  }
  if (['PROCESSING', 'EN_PROCESO'].includes(key)) {
    return 'bg-blue-900/20 text-blue-400 border-blue-400/30'
  }
  if (['SHIPPED', 'ENVIADO', 'EN_CAMINO', 'GUIA_GENERADA'].includes(key)) {
    return 'bg-purple-900/20 text-purple-400 border-purple-400/30'
  }
  if (['DELIVERED', 'ENTREGADO'].includes(key)) {
    return 'bg-green-900/20 text-green-400 border-green-400/30'
  }
  if (['CANCELLED', 'CANCELED', 'CANCELADO', 'REJECTED', 'RECHAZADO'].includes(key)) {
    return 'bg-red-900/20 text-red-400 border-red-400/30'
  }
  return 'bg-gray-900/20 text-gray-400 border-gray-400/30'
}
