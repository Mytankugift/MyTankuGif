import type { OrderDTO } from '@/types/api'

/** Órdenes que deben listarse en Mis Tankus → Compras (no regalos ni StalkerGift). */
export function belongsInPurchasesList(
  order: Pick<OrderDTO, 'isGiftOrder' | 'isStalkerGift'>
): boolean {
  return !order.isGiftOrder && !order.isStalkerGift
}

export type MisTankusOrderSegment = 'compras' | 'regalos'

export function misTankusSegmentForOrder(
  order: Pick<OrderDTO, 'isGiftOrder' | 'isStalkerGift'>
): MisTankusOrderSegment {
  return order.isGiftOrder ? 'regalos' : 'compras'
}
