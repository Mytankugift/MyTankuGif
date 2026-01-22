/**
 * Utilidades para cálculo de precios Tanku
 * 
 * Fórmula estándar: (precio_base * 1.15) + 10,000
 */

/**
 * Obtiene el precio base de una variante (suggestedPrice tiene prioridad sobre price)
 */
export function getBasePrice(variant: { 
  suggestedPrice?: number | null; 
  price: number 
}): number {
  return variant.suggestedPrice || variant.price || 0;
}

/**
 * Calcula el precio final Tanku aplicando la fórmula estándar
 * @param basePrice Precio base (suggestedPrice o price)
 * @returns Precio final calculado redondeado
 */
export function calculateTankuPrice(basePrice: number): number {
  if (!basePrice || basePrice <= 0) return 0;
  return Math.round((basePrice * 1.15) + 10000);
}

/**
 * Calcula el precio final Tanku desde una variante
 * @param variant Variante con suggestedPrice y/o price
 * @returns Precio final calculado
 */
export function calculateTankuPriceFromVariant(variant: {
  suggestedPrice?: number | null;
  price: number;
}): number {
  const basePrice = getBasePrice(variant);
  return calculateTankuPrice(basePrice);
}

