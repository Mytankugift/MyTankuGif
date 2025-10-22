"use client"

import { useState } from "react"
import { Product } from "../../../../../../lib/context"
import { fetchListStoreProduct } from "../../../actions/get-list-store-products"

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  const loadProducts = async () => {
    setIsLoadingProducts(true)
    try {
      const productList = await fetchListStoreProduct()
      setProducts(productList || [])
    } catch (error) {
      console.error("Error loading products:", error)
      setProducts([])
    } finally {
      setIsLoadingProducts(false)
    }
  }

  return {
    products,
    isLoadingProducts,
    loadProducts
  }
}
