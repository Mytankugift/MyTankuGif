"use client"

import UnifiedFeed from "../unified-feed"
import BlackFridayAd from "../black-friday-ad"
import { Product } from "@modules/seller/components/table-products"

interface MyTankuTabProps {
  products: Product[]
  customerId: string
  isLightMode?: boolean
  isLoading?: boolean
  PRODUCTS_PER_PAGE?: number
  hidePostersWhileLoading?: boolean
}

export default function MyTankuTab({ products, customerId, isLightMode = false, isLoading = false, PRODUCTS_PER_PAGE = 50, hidePostersWhileLoading = false }: MyTankuTabProps) {
  return (
    <div className="space-y-8">
      {/* Unified Feed - El banner ahora está integrado dentro del feed */}
      <UnifiedFeed 
        products={products} 
        customerId={customerId} 
        isFeatured={false}
        isLightMode={isLightMode}
        isLoading={isLoading}
        PRODUCTS_PER_PAGE={PRODUCTS_PER_PAGE}
        hidePostersWhileLoading={hidePostersWhileLoading}
      />
    </div>
  )
}    
