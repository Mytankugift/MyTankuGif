"use client"

import UnifiedFeed from "../unified-feed"
import BlackFridayAd from "../black-friday-ad"
import { Product } from "@modules/seller/components/table-products"

interface MyTankuTabProps {
  products: Product[]
  customerId: string
}

export default function MyTankuTab({ products, customerId }: MyTankuTabProps) {
  return (
    <div className="space-y-8">
      
      
      {/* Unified Feed */}
      <UnifiedFeed 
        products={products} 
        customerId={customerId} 
        isFeatured={false} 
      />
      {/* Black Friday Ad */}
      <BlackFridayAd products={products} />
    </div>
  )
}    
