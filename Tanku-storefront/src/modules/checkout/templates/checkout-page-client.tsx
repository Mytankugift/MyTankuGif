"use client"

import { useState } from "react"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "./checkout-form"
import CheckoutSummaryWrapper from "./checkout-summary-wrapper"

export default function CheckoutPageClient({ cart, customer }: { cart: any, customer: any }) {
  const [isFormValid, setIsFormValid] = useState(false)
  const [handleContinue, setHandleContinue] = useState<(() => void) | null>(null)

  const handleFormStateChange = (isValid: boolean, handleContinueFn: () => void) => {
    setIsFormValid(isValid)
    setHandleContinue(() => handleContinueFn)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      <div className="w-full lg:w-[60%] order-2 lg:order-1">
        <PaymentWrapper cart={cart}>
          <CheckoutForm 
            cart={cart} 
            customer={customer} 
            onFormStateChange={handleFormStateChange}
          />
        </PaymentWrapper>
      </div>
      <div className="w-full lg:w-[40%] order-1 lg:order-2 lg:sticky lg:top-6 h-fit">
        <CheckoutSummaryWrapper 
          cart={cart}
          onContinue={handleContinue || undefined}
          isFormValid={isFormValid}
        />
      </div>
    </div>
  )
}

