import { getPercentageDiff } from "@lib/util/get-precentage-diff"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"

type LineItemPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemPriceProps) => {
  // El unit_price que viene del backend ya tiene el incremento aplicado (15% + $10,000)
  // Siempre usar unit_price * quantity para asegurar que tenemos el precio con incremento
  const unitPrice = (item as any).unit_price || item.variant?.price || 0
  const quantity = item.quantity || 1
  
  // Calcular total desde unit_price (que ya tiene incremento)
  // Preferir unit_price * quantity sobre item.total para asegurar que tiene el incremento
  const currentPrice = unitPrice > 0 ? (unitPrice * quantity) : (item.total || 0)
  
  // Para el precio original, necesitaríamos el precio base sin incremento, pero no lo tenemos
  // Por ahora, usar el mismo precio como original
  const originalPrice = item.original_total || currentPrice
  const hasReducedPrice = currentPrice < originalPrice

  return (
    <div className="flex flex-col gap-x-2 text-ui-fg-subtle items-end">
      <div className="text-left">
        {hasReducedPrice && (
          <>
            <p>
              {style === "default" && (
                <span className="text-ui-fg-subtle">Original: </span>
              )}
              <span
                className="line-through text-ui-fg-muted"
                data-testid="product-original-price"
              >
          {convertToLocale({
            amount: originalPrice,
            currency_code: currencyCode || 'COP',
            locale: 'es-CO',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
              </span>
            </p>
            {style === "default" && (
              <span className="text-ui-fg-interactive">
                -{getPercentageDiff(originalPrice, currentPrice || 0)}%
              </span>
            )}
          </>
        )}
        <span
          className={clx("text-base-regular", {
            "text-ui-fg-interactive": hasReducedPrice,
          })}
          data-testid="product-price"
        >
          {convertToLocale({
            amount: currentPrice,
            currency_code: currencyCode || 'COP',
            locale: 'es-CO',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </span>
      </div>
    </div>
  )
}

export default LineItemPrice
