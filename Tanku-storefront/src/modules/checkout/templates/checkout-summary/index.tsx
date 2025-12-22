"use client"

import { Heading, Button } from "@medusajs/ui"
import { ShoppingBag, ArrowLeft } from "@medusajs/icons"
import { useState, useEffect } from "react"

import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { usePersonalInfo } from "@lib/context/personal-info-context"
import { useRouter } from "next/navigation"

const CheckoutSummary = ({ 
  cart, 
  onContinue, 
  isFormValid 
}: { 
  cart: any
  onContinue?: () => void
  isFormValid?: boolean
}) => {
  const [calculatedShippingCost, setCalculatedShippingCost] = useState<number | null>(null)
  const { getUser } = usePersonalInfo()
  const user = getUser()
  const router = useRouter()
  const isAuthenticated = !!user?.id
  
  // Guardar estado del carrito en localStorage antes de redirigir
  const handleContinueWithAuth = () => {
    if (!isAuthenticated) {
      // Guardar el estado actual del checkout en localStorage
      if (cart) {
        localStorage.setItem('tanku_checkout_state', JSON.stringify({
          cartId: cart.id,
          items: cart.items,
          timestamp: Date.now()
        }))
        // Guardar la URL actual para redirigir después del login
        localStorage.setItem('tanku_redirect_after_login', '/checkout')
      }
      router.push('/account')
      return
    }
    
    // Si está autenticado, proceder con el pago
    if (onContinue) {
      onContinue()
    }
  }

  useEffect(() => {
    const handleShippingCostCalculated = (event: CustomEvent) => {
      const { cost } = event.detail
      setCalculatedShippingCost(cost)
    }

    window.addEventListener('shippingCostCalculated', handleShippingCostCalculated as EventListener)
    
    return () => {
      window.removeEventListener('shippingCostCalculated', handleShippingCostCalculated as EventListener)
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
    <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-gray-700/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1 bg-[#66DEDB]/20 rounded-lg">
          <ShoppingBag className="w-4 h-4 text-[#66DEDB]" />
        </div>
        <Heading
          level="h2"
          className="flex flex-row text-base sm:text-lg font-bold items-baseline text-[#66DEDB]"
        >
          Resumen de compra
        </Heading>
      </div>
      <Divider className="my-4 sm:my-6 border-gray-700" />
      <div className="space-y-6">
        <ItemsPreviewTemplate cart={cart} />
        <Divider className="border-gray-700" />
        <CartTotals totals={cartWithShipping} />
        {/* <div className="my-4 sm:my-6">
          <DiscountCode cart={cart} />
        </div> */}
        <div className="pt-2 space-y-3">
          <LocalizedClientLink href="/cart">
            <Button
              className="w-full px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium text-base rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al carrito
            </Button>
          </LocalizedClientLink>
          <Button
            onClick={handleContinueWithAuth}
            className="w-full px-6 py-2.5 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] hover:from-[#5accc9] hover:to-[#66e68f] text-black font-semibold text-base rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={isFormValid === false}
          >
            {isAuthenticated ? 'Continuar con el pago' : 'Inicia sesión para continuar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CheckoutSummary
