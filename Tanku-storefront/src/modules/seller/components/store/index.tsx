"use client"
import React, { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import ChevronDown from "@modules/common/icons/chevron-down"
import User from "@modules/common/icons/user"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"

// Import components
import MyStore from "./components/MyStore"
import TableProducts from "../table-products"
import Orders from "./components/Orders"
import Payments from "./components/Payments"

interface StoreProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

type MenuOption = 'store' | 'products' | 'orders' | 'payments'

const Store: React.FC<StoreProps> = ({ customer, children }) => {


  const [activeMenu, setActiveMenu] = useState<MenuOption>('store')

  const menuItems = [
    { key: 'store' as MenuOption, label: 'Mi Tienda', icon: User },
    { key: 'products' as MenuOption, label: 'Productos', icon: Package },
    { key: 'orders' as MenuOption, label: 'Órdenes', icon: MapPin },
    { key: 'payments' as MenuOption, label: 'Pagos', icon: ChevronDown },
  ]

  const renderContent = () => {
    switch (activeMenu) {
      case 'store':
        return <MyStore />
      case 'products':
        return <TableProducts />
      case 'orders':
        return <Orders customer={customer?.id || ""} />
      case 'payments':
        return <Payments />
      default:
        return <MyStore />
    }
  }

  return (
    <div className="flex-1 h-[90vh] mx-14 my-5 " data-testid="account-page">
      {/* Horizontal Navigation */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-semibold text-white">Tienda</h3>
            {customer && (
              <span className="text-sm text-gray-400">Hola {customer.first_name}</span>
            )}
          </div>
        </div>
        
        {/* Horizontal Menu Buttons */}
        <div className="flex gap-3">
          {menuItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveMenu(key)}
              className={clx(
                "px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium",
                activeMenu === key
                  ? "bg-[#73FFA2] text-gray-900 shadow-lg"
                  : "bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-600"
              )}
              data-testid={`${key}-link`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  )
}

export default Store
