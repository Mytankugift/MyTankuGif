import type { SupportCaseDetail } from '@/lib/types/support-cases'

/** IDs de order_item incluidos en el reporte (uno explícito o todo el pedido). */
export function getSupportCaseReportedItemIds(
  detail: Pick<SupportCaseDetail, 'orderItemId'> & {
    snapshot: Pick<SupportCaseDetail['snapshot'], 'focusedOrderItemId' | 'items'>
  }
): Set<string> {
  const explicit = detail.orderItemId ?? detail.snapshot.focusedOrderItemId
  if (explicit) return new Set([explicit])
  return new Set(detail.snapshot.items.map((item) => item.id))
}

export function isSupportCaseReportedItem(itemId: string, reportedIds: Set<string>): boolean {
  return reportedIds.has(itemId)
}
