import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummaryWrapper from "@modules/checkout/templates/checkout-summary-wrapper"
import CheckoutPageClient from "@modules/checkout/templates/checkout-page-client"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Finalizar compra",
  description: "Completa tu pedido",
}

export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black py-6 sm:py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#66DEDB] via-[#73FFA2] to-[#66DEDB] bg-clip-text text-transparent mb-2">
            Finalizar Compra
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Completa tu información para finalizar tu pedido
          </p>
        </div>
        <CheckoutPageClient cart={cart} customer={customer} />
      </div>
    </div>
  )
}
