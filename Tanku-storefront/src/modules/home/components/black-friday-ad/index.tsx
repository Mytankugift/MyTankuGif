import React from 'react'
import Image from 'next/image'
import { Product } from "@modules/seller/components/table-products"

interface BlackFridayAdProps {
  products: Product[]
}

const BlackFridayAd: React.FC<BlackFridayAdProps> = ({ products }) => {
  // We'll use the first two products for the ad display
  const displayProducts = products.slice(0, 2)

  return (
    <div className="bg-black rounded-lg p-6 my-8 relative overflow-hidden h-96">
      {/* Header */}
      <div className="flex items-center gap-3 z-10 relative">
        <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center p-1">
          <Image
            src="/feed/Icons/icono-saju.svg"
            alt="Sajú Logo"
            width={36}
            height={36}
          />
        </div>
        <h3 className="text-xl font-bold" style={{ color: '#66DEDB' }}>
          Sajú
        </h3>
      </div>

      {/* Diagonal scrollable content */}
      <div className="absolute inset-0 w-full h-full transform -rotate-12 scale-125 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
          {/* Duplicating content for seamless scroll effect */}
          {[...displayProducts, ...displayProducts, ...displayProducts].map((product, index) => (
            <React.Fragment key={index}>
              <div className="flex-shrink-0 w-48 h-48 bg-white rounded-2xl shadow-lg overflow-hidden">
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
              <div className="flex-shrink-0 w-48 h-48 bg-red-500 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center p-4">
                <p className="font-bold text-3xl text-cyan-300">Hasta</p>
                <p className="font-extrabold text-5xl text-cyan-300">50%</p>
                <p className="font-bold text-3xl text-cyan-300">Dto.</p>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Black Friday Text */}
      <div className="absolute bottom-4 right-6 text-right z-10">
        <h2 className="text-6xl font-extrabold leading-none">
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
