import { PriceFormulaType } from '@prisma/client';

// Re-exportar PriceFormulaType para uso en otros módulos
export type { PriceFormulaType };

/**
 * Utilidades para cálculo de precios Tanku usando fórmulas
 */

export interface PriceFormulaValue {
  // Para CUSTOM_STANDARD: fórmula personalizada (base * multiplicador) + suma_fija
  multiplier?: number;    // Multiplicador (ej: 1.20 = 20% de aumento)
  fixedAmount?: number;   // Suma fija a agregar (ej: 15000 = $15,000)
  
  // Para PERCENTAGE: solo porcentaje
  percentage?: number;    // Porcentaje (ej: 15 = 15%)
  
  // Para FIXED: solo suma fija
  fixed?: number;         // Suma fija (ej: 10000 = $10,000)
  
  // Para MIN_MARGIN: margen mínimo garantizado
  minMargin?: number;     // Margen mínimo (ej: 5000 = $5,000 mínimo)
}

/**
 * Calcula tankuPrice usando la fórmula especificada
 * @param basePrice Precio base (suggestedPrice o price)
 * @param formulaType Tipo de fórmula
 * @param formulaValue Valores de la fórmula
 * @returns Precio final calculado redondeado
 */
export function calculateTankuPriceWithFormula(
  basePrice: number,
  formulaType: PriceFormulaType | null,
  formulaValue: PriceFormulaValue | null
): number {
  if (!basePrice || basePrice <= 0) return 0;
  
  // Si no hay fórmula, usar la estándar
  if (!formulaType || !formulaValue) {
    return Math.round((basePrice * 1.15) + 10000);
  }
  
  switch (formulaType) {
    case PriceFormulaType.STANDARD:
      // Fórmula estándar: (base * 1.15) + 10,000
      return Math.round((basePrice * 1.15) + 10000);
      
    case PriceFormulaType.CUSTOM_STANDARD:
      // Fórmula personalizada: (base * multiplicador) + suma_fija
      // Ejemplo: multiplicador=1.20, fixedAmount=15000 → (base * 1.20) + 15000
      const multiplier = formulaValue.multiplier || 1.15;
      const fixedAmount = formulaValue.fixedAmount || 10000;
      return Math.round((basePrice * multiplier) + fixedAmount);
      
    case PriceFormulaType.PERCENTAGE:
      // Solo porcentaje: base + (base * percentage / 100)
      // Ejemplo: percentage=15 → base * 1.15
      const percentage = (formulaValue.percentage || 0) / 100;
      return Math.round(basePrice * (1 + percentage));
      
    case PriceFormulaType.FIXED:
      // Solo suma fija: base + fixed
      // Ejemplo: fixed=10000 → base + 10000
      return Math.round(basePrice + (formulaValue.fixed || 0));
      
    case PriceFormulaType.MIN_MARGIN:
      // Margen mínimo garantizado: base + max(15% de base, margen_mínimo)
      // Ejemplo: minMargin=5000
      //   - Si base=100000 → margen=15000 → resultado=115000
      //   - Si base=20000 → margen=3000, pero minMargin=5000 → resultado=25000
      const minMargin = formulaValue.minMargin || 0;
      const standardMargin = basePrice * 0.15; // 15% estándar
      return Math.round(basePrice + Math.max(standardMargin, minMargin));
      
    default:
      // Fallback a estándar
      return Math.round((basePrice * 1.15) + 10000);
  }
}

/**
 * Obtiene el precio base de una variante
 * IMPORTANTE: Las fórmulas se calculan SOLO desde suggestedPrice (no desde price)
 * @returns suggestedPrice o 0 si no existe
 */
export function getBasePrice(variant: { 
  suggestedPrice?: number | null; 
  price?: number 
}): number {
  // Usar SOLO suggestedPrice para fórmulas (no price como fallback)
  return variant.suggestedPrice || 0;
}

/**
 * Calcula el precio final Tanku desde una variante usando la fórmula del producto
 * @param variant Variante con suggestedPrice y/o price
 * @param formulaType Tipo de fórmula del producto
 * @param formulaValue Valores de la fórmula del producto
 * @returns Precio final calculado
 */
export function calculateTankuPriceFromVariantWithFormula(
  variant: {
    suggestedPrice?: number | null;
    price: number;
  },
  formulaType: PriceFormulaType | null,
  formulaValue: PriceFormulaValue | null
): number {
  const basePrice = getBasePrice(variant);
  return calculateTankuPriceWithFormula(basePrice, formulaType, formulaValue);
}

