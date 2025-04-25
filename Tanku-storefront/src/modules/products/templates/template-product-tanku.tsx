"use client"
import React, { Suspense } from "react"
import { TankuProduct } from "../../../types/global"
import ImageGalleryTanku from "../components/image-gallery-tanku/index"
import ProductActionsTanku from "../components/product-actions-tanku/index"
import ProductTabsTanku from "../components/product-tabs-tanku/index"
import ProductInfoTanku from "./product-info-tanku"
import { notFound } from "next/navigation"
import ProductActionsWrapperTanku from "./product-actions-wrapper-tanku"

type ProductTankuTemplateProps = {
  product: TankuProduct
}

const ProductTankuTemplate: React.FC<ProductTankuTemplateProps> = ({
  product,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  return (
    <>
      <div
        className="content-container flex flex-col small:flex-row small:items-start py-6 relative"
        data-testid="product-tanku-container"
      >
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-6">
          <ProductInfoTanku product={product} />
          <ProductTabsTanku product={product} />
        </div>
        <div className="block w-full relative">
          <ImageGalleryTanku thumbnail={product?.thumbnail} />
        </div>
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-12">
          <Suspense
            fallback={
              <ProductActionsTanku
                disabled={true}
                product={product}
              />
            }
          >
            <ProductActionsWrapperTanku product={product} />
          </Suspense>
        </div>
      </div>
    </>
  )
}

export default ProductTankuTemplate
