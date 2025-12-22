/**
 * Helper functions para normalizar payloads de Dropi
 * NO interpreta reglas de negocio
 * SOLO guarda los bloques RAW tal como vienen
 */

/**
 * Extrae warehouse_product desde payload
 *
 * REGLAS:
 * - SIMPLE: retornar TODO payload.inventory.warehouses[] completo (con warehouse, city, etc.)
 * - VARIABLE: retornar [] (el inventory de VARIABLE vive en variationsData)
 * - NO transformar
 * - NO filtrar
 */
export function extractWarehouseProductFromPayload(payload: any): any[] {
  if (!payload) return []

  // =========================
  // PRODUCTO SIMPLE
  // =========================
  if (payload.type === "SIMPLE") {
    // Buscar warehouses en diferentes ubicaciones posibles
    // Opción 1: payload.inventory.warehouses (estructura esperada según documentación)
    if (Array.isArray(payload.inventory?.warehouses) && payload.inventory.warehouses.length > 0) {
      return payload.inventory.warehouses
    }
    // Opción 2: payload.warehouse_product (puede estar directamente en el payload)
    if (Array.isArray(payload.warehouse_product) && payload.warehouse_product.length > 0) {
      return payload.warehouse_product
    }
    return []
  }

  // =========================
  // PRODUCTO VARIABLE
  // =========================
  // Para VARIABLE, warehouseProduct debe ser null
  // El inventory vive dentro de cada variación en variationsData
  return []
}

/**
 * Extrae IDs de categorías Dropi
 */
export function extractCategoryDropiIdsFromPayload(payload: any): number[] {
  if (!payload || !Array.isArray(payload.categories)) return []

  return payload.categories
    .map((cat: any) => cat.id || cat.pivot?.category_id)
    .filter((id: any): id is number => typeof id === "number")
}

/**
 * Extrae variaciones RAW para productos VARIABLE
 * Retorna TODO el contenido de variations[] sin transformar
 */
export function extractVariationsFromPayload(payload: any): any[] {
  if (!payload || payload.type !== "VARIABLE" || !Array.isArray(payload.variations)) {
    return []
  }

  // Retornar variations[] completo tal cual viene (RAW)
  return payload.variations
}

/**
 * Calcula stock total
 *
 * REGLAS TEMPORALES:
 * - SIMPLE: suma inventory.warehouses[].stock
 * - VARIABLE: NO calcular aquí (evita stocks inflados)
 */
export function calculateTotalStockFromPayload(payload: any): number {
  if (!payload) return 0

  if (payload.type === "SIMPLE") {
    // Buscar warehouses en diferentes ubicaciones posibles
    let warehouses: any[] = []
    if (Array.isArray(payload.inventory?.warehouses) && payload.inventory.warehouses.length > 0) {
      warehouses = payload.inventory.warehouses
    } else if (Array.isArray(payload.warehouse_product) && payload.warehouse_product.length > 0) {
      warehouses = payload.warehouse_product
    }
    
    return warehouses.reduce(
      (sum: number, wh: any) => sum + (parseInt(wh.stock) || 0),
      0
    )
  }

  // VARIABLE: se calcula después con reglas claras
  return 0
}
