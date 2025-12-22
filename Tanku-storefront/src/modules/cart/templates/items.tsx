import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Heading } from "@medusajs/ui"

import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
}

const ItemsTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart?.items
  return (
    <div>
      <div className="py-3 flex items-center bg-zinc-800 px-6 rounded-t-lg">
        <Heading className="text-[2rem] leading-[2.75rem] text-[#66DEDB]">Carrito</Heading>
      </div>
      <div className="w-full overflow-x-auto bg-zinc-800 rounded-b-lg shadow-lg">
        <table className="w-full border-collapse">
          <thead className="bg-zinc-800 border-b border-gray-700">
            <tr className="text-[#3B9BC3] font-medium">
              <th className="p-2 sm:p-3 md:p-4 pl-2 sm:pl-4 md:pl-6 text-left align-middle" style={{width: '80px'}}></th>
              <th className="p-2 sm:p-3 md:p-4 text-left align-middle">Producto</th>
              <th className="p-2 sm:p-3 md:p-4 text-left align-middle">Cantidad</th>
              <th className="p-2 sm:p-3 md:p-4 text-left hidden small:table-cell align-middle">Precio</th>
              <th className="p-2 sm:p-3 md:p-4 pr-2 sm:pr-4 md:pr-6 text-right align-middle">Total</th>
            </tr>
          </thead>
          <tbody className="bg-zinc-800 divide-y divide-gray-700">
            {items
              ? items
                  .sort((a, b) => {
                  return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                })
                .map((item) => {
                  return (
                    <Item
                      key={item.id}
                      item={item}
                      currencyCode={cart?.currency_code || "usd"}
                    />
                  )
                })
            : repeat(8).map((index) => {
                return (
                  <tr key={index} className="hover:bg-gray-900">
                    <td className="p-4 pl-6 w-24">
                      <div className="w-16 h-16 bg-gray-700 rounded-md animate-pulse"></div>
                    </td>
                    <td className="p-4">
                      <div className="w-32 h-4 bg-gray-700 rounded animate-pulse mb-2"></div>
                      <div className="w-24 h-3 bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="p-4">
                      <div className="w-16 h-8 bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="p-4 hidden small:table-cell">
                      <div className="w-16 h-4 bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="w-16 h-4 bg-gray-700 rounded animate-pulse ml-auto"></div>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ItemsTemplate
