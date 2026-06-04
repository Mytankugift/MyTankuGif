import type { SupportCaseType } from '@/types/api'

/**
 * Motivos de postventa — mismo patrón: sustantivo + calificador (o frase directa al usuario).
 * Usar en selector de reporte y en detalle de solicitud.
 */
export const SUPPORT_CASE_TYPE_LABELS: Record<SupportCaseType, string> = {
  NOT_RECEIVED: 'No recibí mi pedido',
  DAMAGED: 'Producto dañado',
  DELAY: 'Demora en el envío',
  WRONG_ITEM: 'Producto incorrecto',
  INCOMPLETE: 'Pedido incompleto',
}

export function formatSupportCaseType(type: string): string {
  return SUPPORT_CASE_TYPE_LABELS[type as SupportCaseType] ?? type.replace(/_/g, ' ')
}
