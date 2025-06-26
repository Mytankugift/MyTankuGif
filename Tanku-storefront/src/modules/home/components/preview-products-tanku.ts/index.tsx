"use client"
import { Text, Button, clx } from "@medusajs/ui"
import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { Product } from "@modules/seller/components/table-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WishListDropdown from "@modules/home/components/wish-list"
import { retrieveCustomer } from "@lib/data/customer"
import dynamic from "next/dynamic"

// Import FbxModel with dynamic import to avoid SSR issues with Three.js

interface PreviewProductsTankuProps {
  products: Product[]
  isFeatured?: boolean
}

// Custom interfaces for our product structure
interface ProductInventory {
  currency_code: string;
  price: number;
}

interface ProductVariantCustom {
  inventory?: ProductInventory;
}

// Extended product type to include 3D model flag
interface ExtendedProduct {
  id: string;
  title: string;
  handle: string;
  thumbnail: string | null;
  is3DModel?: boolean;
  variants?: ProductVariantCustom[];
}

export default function PreviewProductsTanku({ products, isFeatured = false }: PreviewProductsTankuProps) {
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // Create a combined array with the 3D model as the first item followed by regular products
  const allItems = useMemo<ExtendedProduct[]>(() => {
   
    
    // Map the products to match our ExtendedProduct structure
    const mappedProducts: ExtendedProduct[] = products.map(product => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      
      thumbnail: product.thumbnail || null,
      variants: product.variants
    }));
    
    return mappedProducts;
  }, [products])
  
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

  const total = allItems.length

  const prev = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev - 1 + total) % total)
    setTimeout(() => setIsAnimating(false), 500) // Duración de la animación
  }

  const next = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev + 1) % total)
    setTimeout(() => setIsAnimating(false), 500) // Duración de la animación
  }

  const visibleIndexes = [
    (currentIndex - 2 + total) % total,
    (currentIndex - 1 + total) % total,
    currentIndex,
    (currentIndex + 1) % total,
    (currentIndex + 2) % total,
  ]

  return (
    <div className="w-full flex flex-col items-center justify-center ">
      {/* Título con degradado */}
      <div className="w-full   py-3 mb-8 rounded-lg">
        <h2 className="text-5xl font-bold text-center text-blackTanku">Productos Destacados</h2>
      </div>
      
      <div className="w-full flex items-center justify-center h-[300px] relative">
        {/* Botón Anterior */}
        <button
          onClick={prev}
          aria-label="Anterior"
          className="absolute left-4 z-10 p-4 text-4xl font-bold select-none bg-white/80 hover:bg-white rounded-full shadow-lg text-blueTanku transition-all duration-300 flex items-center justify-center h-14 w-14"
        >
          &#8249;
        </button>

        {/* Carrusel */}
        <div className="relative w-full h-[300px] overflow-hidden">
          {visibleIndexes.map((idx, position) => {
            const translateX = (position - 2) * 100 // -200%, -100%, 0%, 100%, 200%
            const item = allItems[idx]
            const is3DModel = item && !!item.is3DModel

            if (!item) return null
            return (
              <div
                key={item.id}
                className="absolute top-0 left-1/2 w-1/3 h-full transition-all duration-500 ease-in-out"
                style={{
                  transform: `translateX(${translateX}%) translateX(-50%)`,
                }}
              >
                {is3DModel ? (
                  // Render 3D model
                  <div className="w-full h-[300px] relative mb-4 overflow-hidden">
                   
                  </div>
                ) : (
                  // Render regular product
                  <LocalizedClientLink key={item.id} href={`/products/tanku/${item.handle}`} className="group">
                    <div className="w-full h-[300px] relative mb-4 overflow-hidden">
                      <Image
                        src={item.thumbnail || '/placeholder.png'}
                        alt={item.title}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </LocalizedClientLink>
                )}
              </div>
            )
          })}
        </div>

        {/* Botón Siguiente */}
        <button
          onClick={next}
          aria-label="Siguiente"
          className="absolute right-4 z-10 p-4 text-4xl font-bold select-none bg-white/80 hover:bg-white rounded-full shadow-lg text-blueTanku transition-all duration-300 flex items-center justify-center h-14 w-14"
        >
          &#8250;
        </button>
      </div>
      <div className="w-full mt-4 transition-opacity duration-300">
        <div className="max-w-3xl mx-auto bg-white p-4 rounded-lg ">
          <Text className="text-blueTanku font-bold text-3xl text-center mb-4">
            {allItems[currentIndex]?.title}
          </Text>
          {allItems[currentIndex]?.variants?.[0]?.inventory && (
            <Text className="text-2xl text-gray-800 text-center mb-6">
              {allItems[currentIndex].variants[0].inventory.currency_code} {
                allItems[currentIndex].variants[0].inventory.price.toLocaleString()
              }
            </Text>
          )}
          <div className="flex justify-center gap-3">
            {!allItems[currentIndex]?.is3DModel ? (
              <>
                <LocalizedClientLink 
                  href={`/products/tanku/${allItems[currentIndex]?.handle}`} 
                  className="inline-block"
                >
                  <button className="bg-blueTanku hover:bg-blueTanku/90 text-white text-xl px-4 py-2 rounded-lg">
                    Comprar Ahora
                  </button>
                </LocalizedClientLink>
                {isAuthenticated && (
                  <WishListDropdown productId={allItems[currentIndex]?.id} productTitle={allItems[currentIndex]?.title} />
                )}
              </>
            ) : (
              <button className="bg-blueTanku hover:bg-blueTanku/90 text-white text-xl px-4 py-2 rounded-lg">
                Ver Modelo 3D
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
