import { Suspense } from "react"
import { HttpTypes } from "@medusajs/types"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import StoreProductsClient from "./store-products-client"
import CategoriesBanner from "./categories-banner"

type StoreTemplateProps = {
  sortBy?: string
  page?: string
  countryCode: string
}

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
}: StoreTemplateProps) => {
  return (
    <div
      className="flex flex-col py-6 content-container"
      data-testid="category-container"
      style={{ backgroundColor: "#1E1E1E", minHeight: "100vh" }}
    >
      <div className="w-full">
        <div className="mb-6 text-2xl-semi">
          <h1 data-testid="store-page-title" className="text-white text-3xl font-bold">Give-Commerce</h1>
        </div>

        {/* Banner de Categorías */}
        <CategoriesBanner />

        <Suspense fallback={<SkeletonProductGrid />}>
          <StoreProductsClient />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
