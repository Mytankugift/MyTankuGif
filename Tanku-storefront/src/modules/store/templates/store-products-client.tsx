"use client"

import { useState, useEffect } from "react"
import UnifiedFeed from "@modules/home/components/unified-feed"
import { fetchListStoreProduct } from "@modules/home/components/actions/get-list-store-products"
import { retrieveCustomer } from "@lib/data/customer"
import { Product } from "@modules/seller/components/table-products"

export default function StoreProductsClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [customerId, setCustomerId] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar productos
        const productList = await fetchListStoreProduct()
        setProducts(productList || [])

        // Cargar customer ID
        const customer = await retrieveCustomer().catch(() => null)
        setCustomerId(customer?.id || "")
      } catch (error) {
        console.error("Error loading products:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#73FFA2]"></div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <UnifiedFeed 
        products={products} 
        customerId={customerId} 
        isFeatured={false} 
      />
    </div>
  )
}



