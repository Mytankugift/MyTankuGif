"use client"
import { HttpTypes } from "@medusajs/types"
import { useState, useCallback } from "react"
import FormTanku from "@modules/checkout/components/form-tanku"

export default function CheckoutForm({
  cart,
  customer,
  onFormStateChange,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  onFormStateChange?: (isValid: boolean, handleContinue: () => void) => void
}) {
  const [handleContinueFn, setHandleContinueFn] = useState<(() => void) | null>(null)
  const [isFormValidState, setIsFormValidState] = useState(false)

  const handleFormStateChange = useCallback((isValid: boolean, handleContinue: () => void) => {
    setIsFormValidState(isValid)
    setHandleContinueFn(() => handleContinue)
    if (onFormStateChange) {
      onFormStateChange(isValid, handleContinue)
    }
  }, [onFormStateChange])

  if (!cart) {
    return null
  }

  return (
    <div className="w-full px-2 sm:px-0">
      <FormTanku 
        cart={cart} 
        customer={customer} 
        onContinueButtonClick={handleFormStateChange}
      />
    </div>
  )
}
