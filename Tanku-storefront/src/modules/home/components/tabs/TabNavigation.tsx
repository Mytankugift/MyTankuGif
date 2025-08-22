"use client"

import { useState } from "react"
import Image from "next/image"
import MyTankuTab from "./MyTankuTab"
import StalkerGiftTab from "./StalkerGiftTab"
import MultiPayTab from "./MultiPayTab"
import ExploreTab from "./ExploreTab"
import { Product } from "@modules/seller/components/table-products"

interface TabNavigationProps {
  products: Product[]
  customerId: string
}

type TabType = 'mytanku' | 'stalkergift' | 'multipay' | 'explore'

export default function TabNavigation({ products, customerId }: TabNavigationProps) {
  const [activeTab, setActiveTab] = useState<TabType>('mytanku')

  const tabs = [
    {
      id: 'mytanku' as TabType,
      label: '#MyTANKU',
      greenIcon: '/feed/Icons/MyTANKU_Green.png',
      blueIcon: '/feed/Icons/MyTANKU_Blue.png'
    },
    {
      id: 'stalkergift' as TabType,
      label: '#StalkerGift',
      greenIcon: '/feed/Icons/StalkerGift_Green.png',
      blueIcon: '/feed/Icons/StalkerGift_Blue.png'
    },
    {
      id: 'multipay' as TabType,
      label: '#MultiPay',
      greenIcon: '/feed/Icons/MultiPay_Green.png',
      blueIcon: '/feed/Icons/MultiPay_Blue.png'
    },
    {
      id: 'explore' as TabType,
      label: '#Explore',
      greenIcon: '/feed/Icons/Explore_Green.png',
      blueIcon: '/feed/Icons/Explore_Blue.png'
    }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'mytanku':
        return <MyTankuTab products={products} customerId={customerId} />
      case 'stalkergift':
        return <StalkerGiftTab />
      case 'multipay':
        return <MultiPayTab />
      case 'explore':
        return <ExploreTab />
      default:
        return <MyTankuTab products={products} customerId={customerId} />
    }
  }

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex md:justify-center justify-center space-x-4 sm:space-x-6 md:space-x-8 mb-6 md:mb-8 overflow-x-auto px-2 sm:px-0 snap-x snap-mandatory">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="flex flex-col items-center group cursor-pointer flex-shrink-0 snap-start"
            onClick={() => setActiveTab(tab.id)}
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 flex flex-col items-center justify-center mb-2 md:mb-3 hover:scale-105 transition-transform relative">
              {/* Green Icon - shown by default, hidden on hover */}
              <Image
                src={tab.greenIcon}
                alt={tab.label}
                width={50}
                height={50}
                className={`object-contain ${
                  activeTab === tab.id ? 'hidden' : 'group-hover:hidden'
                }`}
              />
              {/* Blue Icon - shown when active or on hover */}
              <Image
                src={tab.blueIcon}
                alt={tab.label}
                width={50}
                height={50}
                className={`object-contain absolute top-0 ${
                  activeTab === tab.id ? 'block' : 'hidden group-hover:block'
                }`}
              />
            </div>
            <span className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'text-[#66DEDB]' 
                : 'text-[#73FFA2] group-hover:text-[#66DEDB]'
            }`}>
              {tab.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-screen px-2 sm:px-0">
        {renderTabContent()}
      </div>
    </div>
  )
}
