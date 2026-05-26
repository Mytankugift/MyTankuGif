/**
 * Política de stock para catálogo Tanku (Dropi).
 * Producto/variante activos y visibles en frontend requieren al menos una variante con stock >= umbral.
 * No se usa la suma de todas las variantes.
 */

export const MIN_STOCK_THRESHOLD = 30;

export type VariantWarehouseStock = {
  warehouseVariants?: Array<{ stock: number | null }> | null;
};

/** Suma stock de bodegas de una variante. */
export function sumWarehouseStock(
  warehouseVariants: Array<{ stock: number | null }> | null | undefined
): number {
  return (
    warehouseVariants?.reduce((sum, wv) => sum + (wv.stock || 0), 0) ?? 0
  );
}

export function variantMeetsStockThreshold(stock: number): boolean {
  return stock >= MIN_STOCK_THRESHOLD;
}

/** Mayor stock entre variantes (para mensajes de log). */
export function maxVariantStock(variants: VariantWarehouseStock[]): number {
  return variants.reduce((max, v) => {
    const s = sumWarehouseStock(v.warehouseVariants);
    return s > max ? s : max;
  }, 0);
}

/** Al menos una variante con stock >= MIN_STOCK_THRESHOLD. */
export function productMeetsStockThreshold(variants: VariantWarehouseStock[]): boolean {
  return variants.some((v) =>
    variantMeetsStockThreshold(sumWarehouseStock(v.warehouseVariants))
  );
}

export function stockEligibilityReason(variants: VariantWarehouseStock[]): string {
  const max = maxVariantStock(variants);
  if (max <= 0) {
    return 'sin stock en variantes';
  }
  return `ninguna variante con stock >= ${MIN_STOCK_THRESHOLD} (máx por variante: ${max})`;
}
