"use client"

import { Text, clx } from "@medusajs/ui"
import { updateLineItem } from "@lib/data/cart"
import { updateLineItemCustom } from "@lib/data/cart-custom"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localQuantity, setLocalQuantity] = useState(item.quantity)
  const [localTotal, setLocalTotal] = useState(item.total || (item.unit_price || 0) * item.quantity)
  const router = useRouter()

  // Sincronizar estado local cuando cambie el item desde el servidor
  useEffect(() => {
    setLocalQuantity(item.quantity)
    const unitPrice = item.unit_price || item.variant?.price || 0
    setLocalTotal(item.total || unitPrice * item.quantity)
  }, [item.quantity, item.total, item.unit_price, item.variant?.price])

  const changeQuantity = async (quantity: number) => {
    // Validar cantidad
    if (quantity < 1 || quantity > 5) {
      setError("La cantidad debe estar entre 1 y 5")
      return
    }

    setError(null)
    setUpdating(true)

    // Actualizar estado local inmediatamente para feedback visual
    const oldQuantity = localQuantity
    const unitPrice = item.unit_price || item.variant?.price || 0
    setLocalQuantity(quantity)
    setLocalTotal(unitPrice * quantity)

    try {
      // Usar directamente el método personalizado (ya no usamos Medusa SDK)
      await updateLineItemCustom({
        lineId: item.id,
        quantity,
      })
      
      console.log("✅ Actualización exitosa")
      setError(null)
      
      // NO hacer router.refresh() aquí porque causa un loop infinito:
      // 1. router.refresh() causa que el layout se re-renderice
      // 2. El layout llama a retrieveCart() de nuevo
      // 3. Esto hace otra petición al backend
      // 4. El ciclo se repite
      // 
      // En su lugar, confiamos en que revalidateTag en updateLineItemCustom
      // ya actualizó el cache de Next.js, y los componentes que usan el carrito
      // se actualizarán automáticamente cuando se revalide el tag.
      // 
      // Si es absolutamente necesario refrescar, se puede hacer con un debounce
      // o usando un estado global en lugar de router.refresh()
      // router.refresh()
      
    } catch (err: any) {
      console.error("Error actualizando cantidad:", err)
      
      // Revertir cambios locales si falla
      setLocalQuantity(oldQuantity)
      setLocalTotal(unitPrice * oldQuantity)
      
      setError(err.message || "Error actualizando la cantidad")
    } finally {
      setUpdating(false)
    }
  }

  // Máximo 5 unidades por producto
  const maxQtyFromInventory = 5
  const maxQuantity = Math.min(item.variant?.stock || 5, 5)

  // Obtener información del proveedor/tienda desde los metadatos
  const productMetadata = item.variant?.product?.metadata || item.product?.metadata || {}
  const vendorName = (productMetadata as any)?.vendor_name || (productMetadata as any)?.provider || null
  const storeName = item.variant?.product?.store?.name || null

  if (type === "preview") {
    return (
      <div className="flex gap-2.5 p-2.5 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:bg-gray-800 hover:border-gray-600 transition-all" data-testid="product-row">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className="flex-shrink-0"
        >
          <Thumbnail
            thumbnail={item.thumbnail}
            images={item.variant?.product?.images}
            size="square"
            className="rounded-lg border border-gray-700 w-14 h-14 sm:w-18 sm:h-18"
          />
        </LocalizedClientLink>
        <div className="flex-1 min-w-0">
          <Text
            className="font-semibold text-white text-xs sm:text-sm line-clamp-2 mb-1"
            data-testid="product-title"
          >
            {item.product_title}
          </Text>
          <div className="text-gray-400 text-xs mb-1.5 line-clamp-1">
            <LineItemOptions variant={item.variant} data-testid="product-variant" />
          </div>
          {(vendorName || storeName) && (
            <div className="text-gray-500 text-[10px] mb-1 line-clamp-1">
              {vendorName || storeName}
            </div>
          )}
          <div className="flex items-center justify-between">
            <Text className="text-gray-400 text-xs">
              Cantidad: {localQuantity}
            </Text>
            <Text className="text-[#66DEDB] font-bold text-xs sm:text-sm whitespace-nowrap">
              {convertToLocale({
                amount: localTotal || item.total || 0,
                currency_code: currencyCode || "usd",
              })}
            </Text>
          </div>
        </div>
      </div>
    )
  }

  return (
    <tr className="w-full hover:bg-gray-900 transition-colors" data-testid="product-row">
      <td className="p-2 sm:p-3 md:p-4 pl-2 sm:pl-4 md:pl-6 w-12 sm:w-16 md:w-20 lg:w-24 align-middle">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className={clx("flex", {
            "w-10 sm:w-12 md:w-14 lg:w-16": type === "preview",
            "w-8 sm:w-10 md:w-12 lg:w-16 xl:w-24": type === "full",
          })}
        >
          <Thumbnail
            thumbnail={item.thumbnail}
            images={item.variant?.product?.images}
            size="square"
            className="rounded-md border border-gray-700"
          />
        </LocalizedClientLink>
      </td>

      <td className="p-2 sm:p-3 md:p-4 text-left align-middle">
        <Text
          className="font-medium text-[#3B9BC3] text-xs sm:text-sm md:text-base line-clamp-2"
          data-testid="product-title"
        >
          {item.product_title}
        </Text>
        <div className="text-[#66DEDB] [&_*]:!text-[#66DEDB] [&_*]:!color-[#66DEDB] text-xs sm:text-sm line-clamp-1">
          <LineItemOptions variant={item.variant} data-testid="product-variant" />
        </div>
        {(vendorName || storeName) && (
          <Text className="text-gray-500 text-[10px] sm:text-xs mt-0.5 line-clamp-1">
            {vendorName || storeName}
          </Text>
        )}
      </td>

        <td className="p-2 sm:p-3 md:p-4 align-middle">
          <div className="flex gap-1 sm:gap-2 items-center w-16 sm:w-20 md:w-24 lg:w-28">
            <CartItemSelect
              value={localQuantity}
              onChange={(e) => {
                const newQuantity = parseInt(e.target.value)
                if (newQuantity !== localQuantity) {
                  changeQuantity(newQuantity)
                }
              }}
              className="w-8 sm:w-10 md:w-12 lg:w-14 h-7 sm:h-8 md:h-9 lg:h-10 p-1 sm:p-2 md:p-3 lg:p-4 bg-gray-100 text-gray-800 border border-gray-300 focus:ring-2 focus:ring-[#3B9BC3] focus:outline-none rounded text-xs sm:text-sm md:text-base"
              data-testid="product-select-button"
            >
              {/* TODO: Update this with the v2 way of managing inventory */}
              {Array.from(
                {
                  length: Math.min(maxQuantity, 5),
                },
                (_, i) => (
                  <option value={i + 1} key={i}>
                    {i + 1}
                  </option>
                )
              )}
            </CartItemSelect>
            {updating && <Spinner />}
          </div>
          <ErrorMessage error={error} data-testid="product-error-message" />
        </td>

        <td className="p-2 sm:p-3 md:p-4 hidden sm:table-cell align-middle">
          <Text className="text-[#66DEDB] font-medium text-xs sm:text-sm md:text-base whitespace-nowrap">
            {convertToLocale({
              amount: item.unit_price || 0,
              currency_code: currencyCode || "usd",
            })}
          </Text>
        </td>

      <td className="p-2 sm:p-3 md:p-4 pr-2 sm:pr-4 md:pr-6 text-right align-middle">
        <div className="flex items-center gap-2 justify-end">
          <Text className="text-[#66DEDB] font-medium text-xs sm:text-sm md:text-base whitespace-nowrap">
            {convertToLocale({
              amount: localTotal || item.total || 0,
              currency_code: currencyCode || "usd",
            })}
          </Text>
          <DeleteButton id={item.id} className="text-[#E73230] hover:text-[#ff5652] text-xs sm:text-sm md:text-base ml-2" data-testid="product-delete-button" />
        </div>
      </td>
    </tr>
  )
}

export default Item
