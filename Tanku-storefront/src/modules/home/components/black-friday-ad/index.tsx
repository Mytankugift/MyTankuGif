import React from 'react'
import Image from 'next/image'
import { Product } from "@modules/seller/components/table-products"

interface BlackFridayAdProps {
  products: Product[]
}

const BlackFridayAd: React.FC<BlackFridayAdProps> = ({ products = [] }) => {
  // OPTIMIZACIÓN: Banner funciona sin productos específicos (estático)
  // Si no hay productos, mostrar banner genérico sin productos
  const displayProducts = products && products.length > 0 ? products.slice(0, 2) : []

  return (
    <div className="bg-black rounded-lg p-3 sm:p-4 md:p-6 relative overflow-hidden h-64 sm:h-80 md:h-96">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 z-10 relative">
        <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-yellow-400 flex items-center justify-center p-1">
          <Image
            src="/feed/Icons/icono-saju.svg"
            alt="Sajú Logo"
            width={36}
            height={36}
            className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
          />
        </div>
        <h3 className="text-base sm:text-lg md:text-xl font-bold" style={{ color: '#66DEDB' }}>
          Sajú
        </h3>
      </div>

      {/* Diagonal scrollable content */}
      <div className="absolute inset-0 w-full h-full transform -rotate-12 scale-125 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-3 sm:gap-4 md:gap-6 animate-marquee whitespace-nowrap">
          {/* OPTIMIZACIÓN: Si no hay productos, mostrar solo el banner de descuento */}
          {displayProducts.length > 0 ? (
            // Duplicating content for seamless scroll effect
            [...displayProducts, ...displayProducts, ...displayProducts].map((product, index) => (
              <React.Fragment key={index}>
                <div className="flex-shrink-0 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
                  {product.thumbnail && (
                    <Image
                      src={product.thumbnail}
                      alt={product.title || 'Product'}
                      width={192}
                      height={192}
                      className="object-cover w-full h-full"
                    />
                  )}
                </div>
                <div className="flex-shrink-0 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 bg-red-500 rounded-xl sm:rounded-2xl shadow-lg flex flex-col items-center justify-center text-center p-2 sm:p-3 md:p-4">
                  <p className="font-bold text-xl sm:text-2xl md:text-3xl text-cyan-300">Hasta</p>
                  <p className="font-extrabold text-3xl sm:text-4xl md:text-5xl text-cyan-300">50%</p>
                  <p className="font-bold text-xl sm:text-2xl md:text-3xl text-cyan-300">Dto.</p>
                </div>
              </React.Fragment>
            ))
          ) : (
            // Banner genérico sin productos (más rápido, no depende de datos)
            [...Array(6)].map((_, index) => (
              <div key={index} className="flex-shrink-0 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 bg-red-500 rounded-xl sm:rounded-2xl shadow-lg flex flex-col items-center justify-center text-center p-2 sm:p-3 md:p-4">
                <p className="font-bold text-xl sm:text-2xl md:text-3xl text-cyan-300">Hasta</p>
                <p className="font-extrabold text-3xl sm:text-4xl md:text-5xl text-cyan-300">50%</p>
                <p className="font-bold text-xl sm:text-2xl md:text-3xl text-cyan-300">Dto.</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Black Friday Text */}
      <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 right-3 sm:right-4 md:right-6 text-right z-10">
        <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold leading-none">
          <span className="bg-gradient-to-r from-[#66DEDB] to-[#3B9BC3] bg-clip-text text-transparent">
            BLACK
          </span>
          <br />
          <span className="bg-gradient-to-r from-[#66DEDB] to-[#3B9BC3] bg-clip-text text-transparent">
            FRIDAY
          </span>
        </h2>
      </div>
    </div>
  )
}

export default BlackFridayAd
