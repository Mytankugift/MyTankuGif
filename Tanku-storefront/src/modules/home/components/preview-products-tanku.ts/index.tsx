"use client"
import { Text, Button, clx } from "@medusajs/ui"
import { useState } from "react"
import Image from "next/image"
import { Product } from "@modules/seller/components/table-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WishListDropdown from "@modules/home/components/wish-list"

interface PreviewProductsTankuProps {
  products: Product[]
  isFeatured?: boolean
}

export default function PreviewProductsTanku({ products, isFeatured = false }: PreviewProductsTankuProps) {
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  if (!products || products.length === 0) {
    return null
  }

  const total = products.length

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
            return (
              
              <div
                key={products[idx].id}
                className="absolute top-0 left-1/2 w-1/3 h-full transition-all duration-500 ease-in-out"
                style={{
                  transform: `translateX(${translateX}%) translateX(-50%)`,
                }}
              >
                <LocalizedClientLink key={products[idx].id} href={`/products/tanku/${products[idx].handle}`} className="group">
                <div className="w-full h-[300px] relative mb-4 overflow-hidden">
                  <Image
                    src={products[idx].thumbnail || '/placeholder.png'}
                    alt={products[idx].title}
                    fill
                    className="object-contain"
                  />
                </div>
                </LocalizedClientLink>
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
            {products[currentIndex]?.title}
          </Text>
          {products[currentIndex]?.variants?.[0]?.inventory && (
            <Text className="text-2xl text-gray-800 text-center mb-6">
              {products[currentIndex].variants[0].inventory.currency_code} {
                products[currentIndex].variants[0].inventory.price.toLocaleString()
              }
            </Text>
          )}
          <div className="flex justify-center gap-3">
            <LocalizedClientLink 
              href={`/products/tanku/${products[currentIndex]?.handle}`} 
              className="inline-block"
            >
              <button className="bg-blueTanku hover:bg-blueTanku/90 text-white text-xl px-4 py-2 rounded-lg">
                Comprar Ahora
              </button>
            </LocalizedClientLink>
            {}
            <WishListDropdown productId={products[currentIndex]?.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
