/**
 * Utilidades para manejo de precios
 */

/**
 * Calcula el precio final aplicando la fórmula: (precio * 1.15) + 10,000
 * Esta es la misma fórmula que se usa en las órdenes
 */
export function calculateFinalPrice(basePrice: number): number {
  return Math.round((basePrice * 1.15) + 10000)
}

/**
 * Formatea un precio como moneda colombiana
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Calcula y formatea el precio final
 */
export function formatFinalPrice(basePrice: number): string {
  return formatPrice(calculateFinalPrice(basePrice))
}

