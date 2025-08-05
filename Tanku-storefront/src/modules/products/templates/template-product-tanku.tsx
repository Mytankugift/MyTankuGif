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
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* First Column - 65% */}
          <div className="w-[65%] space-y-8">
            {/* Product Title */}
            <div>
              <h1 className="text-4xl font-bold mb-4 text-[#66DEDB]">{product.title}</h1>
            </div>
            
            {/* Product Image with Shadow */}
            <div className="relative w-full">
              <div 
                className="rounded-2xl overflow-hidden w-full flex justify-center p-8"
                style={{
                  boxShadow: '0 20px 40px rgba(59, 155, 195, 0.4), 0 10px 20px rgba(59, 155, 195, 0.3)'
                }}
              >
                <div className="max-w-md w-full">
                  <ImageGalleryTanku thumbnail={product?.thumbnail} />
                </div>
              </div>
            </div>
            
            {/* Description */}
            <div className="py-6">
              <Heading className="text-xl font-semibold mb-4 text-[#66DEDB]">Descripción</Heading>
              <Text className="text-gray-300 leading-relaxed">
                {product.description}
              </Text>
            </div>
            
            {/* Separator Line */}
            <div className="border-t bottom-5 border-[#66DEDB] my-6"></div>
            
            {/* Store Information */}
            <div className="py-6">
              <Heading className="text-xl font-semibold mb-4 text-[#66DEDB]">Información de la Tienda</Heading>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Text className="font-medium w-32 text-gray-400">Tienda:</Text>
                  <Text className="text-white">{product.store.name}</Text>
                </div>
                <div className="flex items-center">
                  <Text className="font-medium w-32 text-gray-400">Creada:</Text>
                  <Text className="text-gray-300">
                    {new Date(product.store.created_at).toLocaleDateString()}
                  </Text>
                </div>
              </div>
            </div>
            
            {/* Product Tabs */}
            <div>
              <ProductTabsTanku product={product} />
            </div>
          </div>
          
          {/* Second Column - 35% */}
          <div className="w-[35%] space-y-6">
            {/* Action Buttons */}
            <div className="space-y-4">
              <Button className="w-full bg-[#66DEDB] text-black hover:bg-[#5BC5C1] font-semibold py-3 text-lg">
                Comprar Ahora
              </Button>
              
              <div className="flex items-center gap-3">
                {/* Plus Icon (Wishlist) */}
                {isAuthenticated && (
                  <div className="flex-1">
                    <WishListDropdown productId={product.id} productTitle={product.title} />
                  </div>
                )}
                
                {/* Share Icon */}
                <button className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors duration-200">
                  <img src="/feed/arrow-right 4.svg" alt="Share" width="20" height="20" />
                </button>
              </div>
            </div>
            
            {/* Heart Icon with Social Proof */}
            <div className="bg-gray-800 p-4 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Heart className="text-red-500 w-6 h-6" />
                <div>
                  <Text className="text-[#66DEDB] font-medium">Le gusta a 1.510 personas;</Text>
                  <Text className="text-[#66DEDB] text-sm">y al 85% de tus amigos.</Text>
                </div>
              </div>
            </div>
            
            {/* Star Rating */}
            <div className="bg-gray-800 p-4 rounded-2xl">
              <Text className="text-gray-400 mb-2">Valoración:</Text>
              <StarRating />
            </div>
            
            {/* Price and Product Actions */}
            <div className="bg-gray-800 p-6 rounded-2xl">
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
        </div>
      </div>
    </div>
  )
}

export default ProductTankuTemplate
