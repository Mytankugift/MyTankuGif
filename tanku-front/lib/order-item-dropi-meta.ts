import {
  getDropiFullData,
  getDropiSupplierId,
  getDropiSupplierLabel,
  storedDropiDataToPreview,
  storedDropiWebhookOnlyToPreview,
} from '@/lib/dropi-preview-parse'

export type OrderItemDropiMetaInput = {
  id: string
  product: { title: string }
  variant?: { title?: string } | null
  dropiOrderId?: number | null
  dropiWebhookData?: unknown
}

export type OrderItemDropiMeta = {
  orderItemId: string
  productLabel: string
  dropiOrderId: number | null
  supplierId: number | null
  supplierLabel: string | null
  shippingCompany: string | null
  shippingGuide: string | null
}

export function formatOrderItemProductLabel(item: OrderItemDropiMetaInput): string {
  const variant = item.variant?.title
  if (variant && variant !== item.product.title) {
    return `${item.product.title} — ${variant}`
  }
  return item.product.title
}

function webhookRecord(stored: unknown): Record<string, unknown> | null {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null
  return stored as Record<string, unknown>
}

export function getOrderItemDropiMeta(item: OrderItemDropiMetaInput): OrderItemDropiMeta {
  const preview =
    storedDropiDataToPreview(item.dropiWebhookData) ??
    storedDropiWebhookOnlyToPreview(item.dropiWebhookData)
  const fullData = getDropiFullData(preview)
  const record = fullData ?? webhookRecord(item.dropiWebhookData)

  const shippingCompany =
    (typeof preview?.shipping_company === 'string' ? preview.shipping_company : null) ??
    (record && typeof record.shipping_company === 'string' ? record.shipping_company : null)

  const shippingGuide =
    (typeof preview?.shipping_guide === 'string' ? preview.shipping_guide : null) ??
    (record && typeof record.shipping_guide === 'string' ? record.shipping_guide : null)

  const supplierId = record ? getDropiSupplierId(record) : null
  const supplierLabel = record ? getDropiSupplierLabel(record) : null

  return {
    orderItemId: item.id,
    productLabel: formatOrderItemProductLabel(item),
    dropiOrderId: item.dropiOrderId ?? null,
    supplierId,
    supplierLabel,
    shippingCompany: shippingCompany?.trim() ? shippingCompany.trim() : null,
    shippingGuide: shippingGuide?.trim() ? shippingGuide.trim() : null,
  }
}

export function getOrderItemsDropiMeta(items: OrderItemDropiMetaInput[]): OrderItemDropiMeta[] {
  return items
    .filter((i) => i.dropiOrderId != null)
    .map(getOrderItemDropiMeta)
}

export function orderHasDropiMetaToShow(meta: OrderItemDropiMeta[]): boolean {
  return meta.some(
    (m) => m.supplierId != null || m.shippingCompany != null || m.dropiOrderId != null
  )
}
