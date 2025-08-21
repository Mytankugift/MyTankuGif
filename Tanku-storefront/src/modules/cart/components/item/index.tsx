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
      <td className="p-4 pl-6 w-24">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className={clx("flex", {
            "w-16": type === "preview",
            "small:w-24 w-12": type === "full",
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

      <td className="p-4 text-left">
        <Text
          className="font-medium text-[#3B9BC3]"
          data-testid="product-title"
        >
          {item.product_title}
        </Text>
        <div className="text-[#66DEDB] [&_*]:!text-[#66DEDB] [&_*]:!color-[#66DEDB]">
          <LineItemOptions variant={item.variant} data-testid="product-variant" />
        </div>
      </td>

      {type === "full" ? (
        <td className="p-4">
          <div className="flex gap-2 items-center w-28">
            <DeleteButton id={item.id} className="text-[#E73230] hover:text-[#ff5652]" data-testid="product-delete-button" />
            <CartItemSelect
              value={item.quantity}
              onChange={(value) => changeQuantity(parseInt(value.target.value))}
              className="w-14 h-10 p-4 bg-gray-100 text-gray-800 border border-gray-300 focus:ring-2 focus:ring-[#3B9BC3] focus:outline-none rounded"
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
        <td className="p-4"></td>
      )}

      {type === "full" ? (
        <td className="p-4 hidden small:table-cell">
          <Text className="text-[#66DEDB] font-medium">
            {convertToLocale({
              amount: item.unit_price || 0,
              currency_code: currencyCode || "usd",
            })}
          </Text>
        </td>
      ) : (
        <td className="p-4 hidden small:table-cell"></td>
      )}

      <td className="p-4 pr-6 text-right">
        <Text className="text-[#66DEDB] font-medium">
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
