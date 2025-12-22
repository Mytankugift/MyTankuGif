/**
 * Calcula el precio final de un producto aplicando el incremento
 * Fórmula: (precio * 1.15) + 10,000
 * 
 * @param basePrice - Precio base del producto
 * @returns Precio final con incremento
 */
export function calculateFinalPrice(basePrice: number): number {
  if (!basePrice || basePrice <= 0) {
    return 0
  }
  // Aplicar 15% de incremento y luego sumar $10,000
  return Math.round((basePrice * 1.15) + 10000)
}

/**
 * Calcula el total de un item (precio final * cantidad)
 * 
 * @param basePrice - Precio base del producto
 * @param quantity - Cantidad del producto
 * @returns Total del item
 */
export function calculateItemTotal(basePrice: number, quantity: number): number {
  const finalPrice = calculateFinalPrice(basePrice)
  return finalPrice * quantity
}

