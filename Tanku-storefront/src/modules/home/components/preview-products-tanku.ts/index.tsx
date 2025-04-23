"use client"

import { Text } from "@medusajs/ui"
import Thumbnail from "@modules/products/components/thumbnail"
import { Product } from "@modules/seller/components/table-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"


interface PreviewProductsTankuProps {
  products: Product[]
  isFeatured?: boolean
}

export default function PreviewProductsTanku({ products, isFeatured = false }: PreviewProductsTankuProps) {
  return (
    <div className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-4 gap-y-8">
      {products?.map((product) => (
        <LocalizedClientLink key={product.id} href={`/products/tanku/${product.handle}`} className="group">

        <div  className="group" data-testid="product-wrapper">
          <Thumbnail
            thumbnail={product.thumbnail || "/placeholder.png"}
            size="full"
            isFeatured={isFeatured}
          />
          <div className="flex txt-compact-medium mt-4 justify-between">
            <div className="flex flex-col">
              <Text className="text-ui-fg-subtle" data-testid="product-title">
                {product.title}
              </Text>
              {product.variants && product.variants[0]?.inventory && (
                <Text className="text-ui-fg-muted text-sm">
                  {product.variants[0].inventory.currency_code}{" "}
                  {product.variants[0].inventory.price.toLocaleString()}
                </Text>
              )}
            </div>
          </div>
        </div>
        </LocalizedClientLink>

      ))}
    </div>
  )
}
