export type DropiHistoryEntry = {
  status?: string
  notes?: string | null
  created_at?: string
}

export type DropiStatusPreview = {
  id?: number
  status?: string
  shipping_company?: string | null
  shipping_guide?: string | null
  sticker?: string | null
  full_data?: Record<string, unknown>
  [key: string]: unknown
}

export function getDropiFullData(preview: DropiStatusPreview | null | undefined) {
  if (!preview) return null
  const nested = preview.full_data
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }
  return preview as Record<string, unknown>
}

export function getDropiHistory(data: Record<string, unknown>): DropiHistoryEntry[] {
  const history = data.history
  if (!Array.isArray(history)) return []
  return history as DropiHistoryEntry[]
}

export function getDropiHistorySorted(data: Record<string, unknown>): DropiHistoryEntry[] {
  return getDropiHistory(data).slice().sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return ta - tb
  })
}

export function getDropiProductName(data: Record<string, unknown>): string | null {
  const details = data.orderdetails
  if (!Array.isArray(details) || details.length === 0) return null
  const first = details[0] as { product?: { name?: string } }
  return first.product?.name ?? null
}

export function getDropiSupplierId(data: Record<string, unknown>): number | null {
  const top = data.supplier_id
  if (typeof top === 'number' && Number.isFinite(top)) return top
  if (typeof top === 'string' && /^\d+$/.test(top.trim())) return parseInt(top.trim(), 10)

  const supplier = data.supplier
  if (!supplier || typeof supplier !== 'object') return null
  const s = supplier as { id?: number; key_base_data?: number }
  const id = s.id ?? s.key_base_data
  return id != null && Number.isFinite(Number(id)) ? Number(id) : null
}

export function getDropiSupplierLabel(data: Record<string, unknown>): string | null {
  const id = getDropiSupplierId(data)
  if (id == null) return null

  const supplier = data.supplier
  if (supplier && typeof supplier === 'object') {
    const s = supplier as { name?: string; store_name?: string }
    const name = s.store_name ?? s.name
    if (typeof name === 'string' && name.trim()) {
      return `${name.trim()} (#${id})`
    }
  }

  return `Proveedor Dropi #${id}`
}

export const DROPI_PREVIEW_CACHE_TTL_MS = 10 * 60 * 1000

/** Datos persistidos en order_items.dropi_webhook_data tras sync con myorders. */
export function hasStoredDropiHistory(stored: unknown): boolean {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return false
  return Array.isArray((stored as Record<string, unknown>).history)
}

/** Convierte dropiWebhookData de BD al shape que usa el modal (sin llamar a Dropi). */
export function storedDropiDataToPreview(stored: unknown): DropiStatusPreview | null {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null
  const row = stored as Record<string, unknown>

  if (hasStoredDropiHistory(stored)) {
    return {
      id: typeof row.id === 'number' ? row.id : undefined,
      status: typeof row.status === 'string' ? row.status : undefined,
      shipping_company:
        typeof row.shipping_company === 'string' ? row.shipping_company : null,
      shipping_guide: typeof row.shipping_guide === 'string' ? row.shipping_guide : null,
      sticker: typeof row.sticker === 'string' ? row.sticker : null,
      full_data: row,
    }
  }

  if (row.full_data && typeof row.full_data === 'object' && !Array.isArray(row.full_data)) {
    return row as DropiStatusPreview
  }

  return null
}

/** Payload mínimo del webhook (sin history); útil mientras se consulta myorders. */
export function storedDropiWebhookOnlyToPreview(stored: unknown): DropiStatusPreview | null {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null
  if (hasStoredDropiHistory(stored)) return null
  const row = stored as Record<string, unknown>
  const status = typeof row.status === 'string' ? row.status : undefined
  if (!status) return null
  return {
    status,
    shipping_company:
      typeof row.shipping_company === 'string' ? row.shipping_company : null,
    shipping_guide: typeof row.shipping_guide === 'string' ? row.shipping_guide : null,
    sticker: typeof row.sticker === 'string' ? row.sticker : null,
  }
}
