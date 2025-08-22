import React from "react"

import UnderlineLink from "@modules/common/components/interactive-link"

import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div className="flex-1  h-[100vh] bg-[#1E1E1E]" data-testid="account-page">
      <div className="flex-1  h-full  w-full  bg-white flex ">
        <div className="h-full">
        
        </div>
        <div className=" w-full   overflow-auto ">
          <div className="flex-1 ">{children}</div>
        </div>
        {/* <div className="flex flex-col small:flex-row items-end justify-between small:border-t border-gray-200 py-12 gap-8">
          <div>
            <h3 className="text-xl-semi mb-4">Got questions?</h3>
            <span className="txt-medium">
              You can find frequently asked questions and answers on our
              customer service page.
            </span>
          </div>
          <div>
            <UnderlineLink href="/customer-service">
              Customer Service
            </UnderlineLink>
          </div>
        </div> */}
      </div>
    </div>
  )
}

export default AccountLayout
