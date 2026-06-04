export type DropiHistoryEntry = {
  status?: string
  notes?: string | null
  created_at?: string
}

export function getDropiFullData(preview: Record<string, unknown> | undefined) {
  if (!preview) return null
  const nested = preview.full_data
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }
  return preview
}

export function getDropiHistory(data: Record<string, unknown>): DropiHistoryEntry[] {
  const history = data.history
  if (!Array.isArray(history)) return []
  return history as DropiHistoryEntry[]
}

export function getLastDropiHistoryEntry(data: Record<string, unknown>): DropiHistoryEntry | null {
  const history = getDropiHistory(data)
  if (history.length === 0) return null
  return history[history.length - 1] ?? null
}

export function getDropiProductName(data: Record<string, unknown>): string | null {
  const details = data.orderdetails
  if (!Array.isArray(details) || details.length === 0) return null
  const first = details[0] as { product?: { name?: string } }
  return first.product?.name ?? null
}

export function parseTankuOrderIdFromDropiNotes(notes: unknown): string | null {
  if (typeof notes !== 'string') return null
  const match = notes.match(/Orden Tanku:\s*(\S+)/i)
  return match?.[1] ?? null
}

export function getDropiHistorySorted(data: Record<string, unknown>): DropiHistoryEntry[] {
  return getDropiHistory(data).slice().sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return ta - tb
  })
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

export function getDropiWarehouseLabel(data: Record<string, unknown>): string | null {
  const warehouse = data.warehouse
  if (!warehouse || typeof warehouse !== 'object') return null
  const w = warehouse as { name?: string; city?: { name?: string } }
  const city = w.city?.name
  if (w.name && city) return `${w.name} · ${city}`
  return w.name ?? city ?? null
}

export const DROPI_PREVIEW_CACHE_TTL_MS = 10 * 60 * 1000
