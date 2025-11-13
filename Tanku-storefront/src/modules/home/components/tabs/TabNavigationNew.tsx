"use client"

import Image from "next/image"
import MyTankuTab from "./MyTankuTab"
import { Product } from "@modules/seller/components/table-products"

interface TabNavigationProps {
  products: Product[]
  customerId: string
}

export default function TabNavigationNew({ products, customerId }: TabNavigationProps) {
  // Solo mostramos MyTANKU ahora
  return (
    <>
      {/* Tab Navigation - Solo MyTANKU - Sticky mejorado */}
      <div className="sticky top-0 z-40 bg-[#1E1E1E] border-b border-gray-800 py-3 mb-4 shadow-lg">
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center mb-2">
              <Image
                src="/feed/Icons/MyTANKU_Blue.png"
                alt="#MyTANKU"
                width={80}
                height={80}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-sm md:text-base font-semibold" style={{ color: '#66DEDB' }}>
              #MyTANKU
            </span>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-screen px-2 sm:px-0">
        <MyTankuTab products={products} customerId={customerId} />
      </div>
    </>
  )
}

