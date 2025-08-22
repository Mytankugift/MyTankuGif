"use client"

import { Text, clx } from "@medusajs/ui"
import { updateLineItem } from "@lib/data/cart"
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
import { useState } from "react"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    await updateLineItem({
      lineId: item.id,
      quantity,
    })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setUpdating(false)
      })
  }

  // TODO: Update this to grab the actual max inventory
  const maxQtyFromInventory = 10
  const maxQuantity = item.variant?.manage_inventory ? 10 : maxQtyFromInventory

  return (
    <tr className="w-full hover:bg-gray-900 transition-colors" data-testid="product-row">
      <td className="p-1 sm:p-2 md:p-3 lg:p-4 pl-2 sm:pl-3 md:pl-4 lg:pl-6 w-12 sm:w-16 md:w-20 lg:w-24">
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

      <td className="p-1 sm:p-2 md:p-3 lg:p-4 text-left">
        <Text
          className="font-medium text-[#3B9BC3] text-xs sm:text-sm md:text-base line-clamp-2"
          data-testid="product-title"
        >
          {item.product_title}
        </Text>
        <div className="text-[#66DEDB] [&_*]:!text-[#66DEDB] [&_*]:!color-[#66DEDB] text-xs sm:text-sm line-clamp-1">
          <LineItemOptions variant={item.variant} data-testid="product-variant" />
        </div>
      </td>

      {type === "full" ? (
        <td className="p-1 sm:p-2 md:p-3 lg:p-4">
          <div className="flex gap-1 sm:gap-2 items-center w-16 sm:w-20 md:w-24 lg:w-28">
            <DeleteButton id={item.id} className="text-[#E73230] hover:text-[#ff5652] text-xs sm:text-sm md:text-base" data-testid="product-delete-button" />
            <CartItemSelect
              value={item.quantity}
              onChange={(value) => changeQuantity(parseInt(value.target.value))}
              className="w-8 sm:w-10 md:w-12 lg:w-14 h-7 sm:h-8 md:h-9 lg:h-10 p-1 sm:p-2 md:p-3 lg:p-4 bg-gray-100 text-gray-800 border border-gray-300 focus:ring-2 focus:ring-[#3B9BC3] focus:outline-none rounded text-xs sm:text-sm md:text-base"
              data-testid="product-select-button"
            >
              {/* TODO: Update this with the v2 way of managing inventory */}
              {Array.from(
                {
                  length: Math.min(maxQuantity, 10),
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
      ) : (
        <td className="p-1 sm:p-2 md:p-3 lg:p-4"></td>
      )}

      {type === "full" ? (
        <td className="p-1 sm:p-2 md:p-3 lg:p-4 hidden sm:table-cell">
          <Text className="text-[#66DEDB] font-medium text-xs sm:text-sm md:text-base whitespace-nowrap">
            {convertToLocale({
              amount: item.unit_price || 0,
              currency_code: currencyCode || "usd",
            })}
          </Text>
        </td>
      ) : (
        <td className="p-1 sm:p-2 md:p-3 lg:p-4 hidden sm:table-cell"></td>
      )}

      <td className="p-1 sm:p-2 md:p-3 lg:p-4 pr-2 sm:pr-3 md:pr-4 lg:pr-6 text-right">
        <Text className="text-[#66DEDB] font-medium text-xs sm:text-sm md:text-base whitespace-nowrap">
          {convertToLocale({
            amount: item.total || 0,
            currency_code: currencyCode || "usd",
          })}
        </Text>
      </td>
    </tr>
  )
}

export default Item
