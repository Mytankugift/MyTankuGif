"use client"

import { Button, Heading } from "@medusajs/ui"
import { useState, useEffect } from "react"

import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type SummaryProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart }: SummaryProps) => {
  const step = getCheckoutStep(cart)
  const [calculatedShippingCost, setCalculatedShippingCost] = useState<number | null>(null)

  useEffect(() => {
    const handleShippingCostCalculated = (event: CustomEvent) => {
      const { cost } = event.detail
      setCalculatedShippingCost(cost)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('shippingCostCalculated', handleShippingCostCalculated as EventListener)
      
      return () => {
        window.removeEventListener('shippingCostCalculated', handleShippingCostCalculated as EventListener)
      }
    }
  }, [])

  // Crear un carrito modificado con el costo de envío calculado
  // El extra se calculará en CartTotals para evitar duplicación
  const cartWithShipping = {
    ...cart,
    shipping_subtotal: calculatedShippingCost || cart.shipping_subtotal,
    items: cart.items // Pasar los items para el cálculo correcto
  }

  return (
    <div className="flex flex-col gap-y-4">
      <Heading level="h2" className="text-[2rem] leading-[2.75rem] text-[#66DEDB]">
        Resumen
      </Heading>
      <DiscountCode cart={cart} />
      <Divider className="bg-gray-700" />
      <CartTotals totals={cartWithShipping} />
      <LocalizedClientLink
        href={"/checkout?step=" + step}
        data-testid="checkout-button"
      >
        <Button className="w-full h-10 bg-[#3B9BC3] hover:bg-[#2A7A9B] text-white border-none">Ir a pagar</Button>
      </LocalizedClientLink>
    </div>
  )
}

export default Summary
