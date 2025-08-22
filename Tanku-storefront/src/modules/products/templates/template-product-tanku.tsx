"use client"
import React, { Suspense, useState } from "react"
import { TankuProduct } from "../../../types/global"
import ImageGalleryTanku from "../components/image-gallery-tanku/index"
import ProductActionsTanku from "../components/product-actions-tanku/index"
import ProductTabsTanku from "../components/product-tabs-tanku/index"
import { notFound } from "next/navigation"
import ProductActionsWrapperTanku from "./product-actions-wrapper-tanku"
import { Text, Heading, Button } from "@medusajs/ui"
import { Heart } from "@medusajs/icons"
import WishListDropdown from "@modules/home/components/wish-list"
import { retrieveCustomer } from "@lib/data/customer"
import { useEffect } from "react"
import Image from "next/image"

type ProductTankuTemplateProps = {
  product: TankuProduct
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
            <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
            </svg>
          )
        } else if (i === fullStars && hasHalfStar) {
          return (
            <svg key={i} className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20">
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
            <svg key={i} className="w-5 h-5 text-gray-300" viewBox="0 0 20 20">
              <path fill="currentColor" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
            </svg>
          )
        }
      })}
      <span className="text-sm text-gray-600 ml-1">{rating}</span>
    </div>
  )
}

const ProductTankuTemplate: React.FC<ProductTankuTemplateProps> = ({
  product,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  useEffect(() => {
    const checkAuth = async () => {
      const customer = await retrieveCustomer().catch(() => null)
      setIsAuthenticated(!!customer)
    }
    
    checkAuth()
  }, [])

  if (!product || !product.id) {
    return notFound()
  }

  return (
    <div className="bg-[#1E1E1E] min-h-screen text-white">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* First Column - Main content */}
          <div className="w-full lg:w-2/3 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Product Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4 text-[#66DEDB]">{product.title}</h1>
            </div>
            
            {/* Product Image with Shadow */}
            <div className="relative w-full">
              <div 
                className="rounded-2xl overflow-hidden w-full flex justify-center p-3 sm:p-5 md:p-8"
                style={{
                  boxShadow: '0 10px 20px rgba(59, 155, 195, 0.3), 0 5px 10px rgba(59, 155, 195, 0.2)'
                }}
              >
                <div className="max-w-md w-full">
                  <ImageGalleryTanku thumbnail={product?.thumbnail} />
                </div>
                
              </div>
            </div>
            
            {/* Description */}
            <div className="py-3 sm:py-4 md:py-6">
              <Heading className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4 text-[#66DEDB]">Descripción</Heading>
              <Text className="text-gray-300 text-sm sm:text-base leading-relaxed">
                {product.description}
              </Text>
            </div>
            
            {/* Separator Line */}
            <div className="border-t bottom-5 border-[#66DEDB] my-3 sm:my-4 md:my-6"></div>
            
            {/* Store Information */}
            <div className="py-3 sm:py-4 md:py-6">
              <Heading className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4 text-[#66DEDB]">Información de la Tienda</Heading>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <Text className="font-medium sm:w-32 text-gray-400">Tienda:</Text>
                  <Text className="text-white">{product.store.name}</Text>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <Text className="font-medium sm:w-32 text-gray-400">Creada:</Text>
                  <Text className="text-gray-300">
                    {new Date(product.store.created_at).toLocaleDateString()}
                  </Text>
                </div>
              </div>
            </div>
            
           
          </div>
          
          {/* Second Column - Side content */}
          <div className="w-full lg:w-1/3 space-y-4 sm:space-y-5 lg:space-y-6">
            {/* Action Buttons */}
            <div className="space-y-4">
              
              
             
            </div>
            
            {/* Heart Icon with Social Proof */}
            <div className="bg-gray-800 p-3 sm:p-4 rounded-2xl">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-2">
                <Image src="/feed/icons/Like_Green.png" alt="Heart" width="24" height="24" className="mt-1 sm:mt-0" />
                <div>
                  <Text className="text-[#66DEDB] text-sm sm:text-base font-medium">Le gusta a 1.510 personas;</Text>
                  <Text className="text-[#66DEDB] text-xs sm:text-sm">y al 85% de tus amigos.</Text>
                </div>
              </div>
            </div>
            
            {/* Star Rating */}
            <div className="bg-gray-800 p-3 sm:p-4 rounded-2xl">
              <Text className="text-gray-400 text-sm sm:text-base mb-1 sm:mb-2">Valoración:</Text>
              <StarRating />
            </div>
            
            {/* Price and Product Actions */}
            <div className="bg-gray-800 p-3 sm:p-4 md:p-6 rounded-2xl">
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
            <div className="flex items-center gap-2 sm:gap-3">
                {/* Plus Icon (Wishlist) */}
                {isAuthenticated && (
                  <div className="flex-1">
                    <WishListDropdown productId={product.id} productTitle={product.title} />
                  </div>
                )}
                
                {/* Share Icon */}
                <button className="p-2 sm:p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors duration-200">
                  <img src="/feed/arrow-right 4.svg" alt="Share" width="18" height="18" className="sm:w-5 sm:h-5" />
                </button>
              </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTankuTemplate
