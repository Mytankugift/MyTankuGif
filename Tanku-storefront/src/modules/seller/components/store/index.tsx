"use client"
import React from "react"
import SellerNav from "../seller-nav"
import { HttpTypes } from "@medusajs/types"

interface StoreProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const Store: React.FC<StoreProps> = ({ customer, children }) => {
  return (
    <div className="flex-1 h-[90vh]" data-testid="account-page">
      <div className="flex-1 h-full w-full bg-white flex">
        <div className="h-full">
          {customer && <SellerNav customer={customer} />}
        </div>
        <div className="w-full m-[10%]">
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default Store
