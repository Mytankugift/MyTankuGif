"use client"

import CheckoutSummary from "./checkout-summary"

export default function CheckoutSummaryWrapper({
  cart,
  onContinue,
  isFormValid,
}: {
  cart: any
  onContinue?: () => void
  isFormValid?: boolean
}) {
  return (
    <CheckoutSummary 
      cart={cart}
      onContinue={onContinue}
      isFormValid={isFormValid}
    />
  )
}

