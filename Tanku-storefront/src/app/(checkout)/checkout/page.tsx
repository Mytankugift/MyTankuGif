import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
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
    <div className="flex flex-col md:flex-row w-full overflow-x-hidden px-2 sm:px-4 md:px-6 lg:px-10 gap-3 sm:gap-4 md:gap-6 lg:gap-10 my-3 sm:my-4 md:my-6 lg:my-10">
      <div className="w-full md:w-1/2 order-2 md:order-1">
        <PaymentWrapper cart={cart}>
          <CheckoutForm cart={cart} customer={customer} />
        </PaymentWrapper>
      </div>
      <div className="bg-zinc-800 rounded-lg p-3 sm:p-4 md:p-5 lg:p-6 h-fit w-full md:w-1/2 order-1 md:order-2 md:mt-10 lg:mt-14">
        <CheckoutSummary cart={cart} />
      </div>
    </div>
  )
}
