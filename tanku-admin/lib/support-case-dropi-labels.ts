import type { SupportCaseDropiOrderItem } from '@/lib/types/support-cases'

export function formatSupportCaseDropiOrderItemLabel(item: SupportCaseDropiOrderItem): string {
  if (item.variantTitle && item.variantTitle !== item.productTitle) {
    return `${item.productTitle} — ${item.variantTitle}`
  }
  return item.productTitle
}

export function formatDropiSupplierLinkLabel(
  supplierId: number,
  supplierName?: string | null
): string {
  if (supplierName?.trim()) {
    return `${supplierName.trim()} (#${supplierId})`
  }
  return `Proveedor #${supplierId}`
}
