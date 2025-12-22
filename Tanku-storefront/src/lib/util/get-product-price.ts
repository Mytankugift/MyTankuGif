import { HttpTypes } from "@medusajs/types"
import { getPercentageDiff } from "./get-precentage-diff"
import { convertToLocale } from "./money"

export const getPricesForVariant = (variant: any) => {
  if (!variant?.calculated_price?.calculated_amount) {
    return null
  }

  // calculated_amount viene tal cual de Medusa (sin conversiones)
  // Ejemplo: 25000 = $25,000 COP
  const calculatedAmountInUnits = variant.calculated_price.calculated_amount
  const originalAmountInUnits = variant.calculated_price.original_amount || variant.calculated_price.calculated_amount

  return {
    calculated_price_number: calculatedAmountInUnits, // En unidades, no centavos
    calculated_price: convertToLocale({
      amount: calculatedAmountInUnits, // En unidades
      currency_code: variant.calculated_price.currency_code,
    }),
    original_price_number: originalAmountInUnits, // En unidades, no centavos
    original_price: convertToLocale({
      amount: originalAmountInUnits, // En unidades
      currency_code: variant.calculated_price.currency_code,
    }),
    currency_code: variant.calculated_price.currency_code,
    price_type: variant.calculated_price.calculated_price?.price_list_type,
    percentage_diff: getPercentageDiff(
      originalAmountInUnits,
      calculatedAmountInUnits
    ),
  }
}

export function getProductPrice({
  product,
  variantId,
}: {
  product: HttpTypes.StoreProduct
  variantId?: string
}) {
  if (!product || !product.id) {
    throw new Error("No product provided")
  }

  const cheapestPrice = () => {
    if (!product || !product.variants?.length) {
      return null
    }

    const cheapestVariant: any = product.variants
      .filter((v: any) => !!v.calculated_price)
      .sort((a: any, b: any) => {
        return (
          a.calculated_price.calculated_amount -
          b.calculated_price.calculated_amount
        )
      })[0]

    return getPricesForVariant(cheapestVariant)
  }

  const variantPrice = () => {
    if (!product || !variantId) {
      return null
    }

    const variant: any = product.variants?.find(
      (v) => v.id === variantId || v.sku === variantId
    )

    if (!variant) {
      return null
    }

    return getPricesForVariant(variant)
  }

  return {
    product,
    cheapestPrice: cheapestPrice(),
    variantPrice: variantPrice(),
  }
}
