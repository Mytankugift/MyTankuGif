"use client"
import { Text, Button } from "@medusajs/ui"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Product } from "@modules/seller/components/table-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WishListDropdown from "@modules/home/components/wish-list"
import { retrieveCustomer } from "@lib/data/customer"

interface PreviewProductsTankuProps {
  products: Product[]
  isFeatured?: boolean
}

// Star rating component
const StarRating = ({ rating = 4.8 }: { rating?: number }) => {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 !== 0
  
  return (
    <div className="flex items-center gap-1 mb-2">
      {[...Array(5)].map((_, i) => {
        if (i < fullStars) {
          return (
            <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
            </svg>
          )
        } else if (i === fullStars && hasHalfStar) {
          return (
            <svg key={i} className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20">
              <defs>
                <linearGradient id="half">
                  <stop offset="50%" stopColor="currentColor"/>
                  <stop offset="50%" stopColor="transparent"/>
                </linearGradient>
              </defs>
              <path fill="url(#half)" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
            </svg>
          )
        } else {
          return (
            <svg key={i} className="w-4 h-4 text-gray-300" viewBox="0 0 20 20">
              <path fill="currentColor" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
            </svg>
          )
        }
      })}
      <span className="text-sm text-gray-600 ml-1">{rating}</span>
    </div>
  )
}

export default function PreviewProductsTanku({ products, isFeatured = false }: PreviewProductsTankuProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  useEffect(() => {
    const checkAuth = async () => {
      const customer = await retrieveCustomer().catch(() => null)
      setIsAuthenticated(!!customer)
    }
    
    checkAuth()
  }, [])

  if (!products || products.length === 0) {
    return null
  }

  return (
    <div className="w-full px-4 py-8">
      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {products.map((product) => {
          const price = product.variants?.[0]?.inventory?.price || 0
          const currencyCode = product.variants?.[0]?.inventory?.currency_code || '$'
          
          return (
            <div 
              key={product.id} 
              className="bg-transparent border-2 border-[#66DEDB] rounded-2xl p-4 hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              {/* Star Rating */}
              <StarRating />
              
              {/* Product Image */}
              <LocalizedClientLink href={`/products/tanku/${product.handle}`} className="block">
                <div className="w-full h-48 relative mb-4 overflow-hidden rounded-lg">
                  <Image
                    src={product.thumbnail || '/placeholder.png'}
                    alt={product.title}
                    fill
                    className="object-cover hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </LocalizedClientLink>
              
              {/* Product Title */}
              <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                {product.title}
              </h3>
              
              {/* Price */}
              <div className="text-xl flex justify-between font-bold text-[#66DEDB] mb-4">
                {currencyCode} {price.toLocaleString()}
                <div className="flex items-right">
                {/* Cart Icon */}
                <button className="p-2 hover:bg-gray-700 rounded-full transition-colors duration-200">
                  <img src="/feed/Carrito 4.svg" alt="Add to cart" width="24" height="24" />
                </button>
                
                {/* Plus Icon (Wishlist) */}
                {isAuthenticated && (
                  <WishListDropdown productId={product.id} productTitle={product.title} />
                )}
                
                {/* Share Icon */}
                <button className="p-2 hover:bg-gray-700 rounded-full transition-colors duration-200">
                  <img src="/feed/arrow-right 4.svg" alt="Share" width="24" height="24" />
                </button>
              </div>
              </div>
              
              {/* Action Icons */}
              
            </div>
          )
        })}
      </div>
    </div>
  )
}
