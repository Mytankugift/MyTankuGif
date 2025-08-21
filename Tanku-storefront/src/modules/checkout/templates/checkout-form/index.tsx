"use client"
import { HttpTypes } from "@medusajs/types"
import dynamic from "next/dynamic"
import FormTanku from "@modules/checkout/components/form-tanku"

export default function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  return (
    <div className="w-full ">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-[#66DEDB]">Finalizar compra</h1>
      <FormTanku cart={cart} customer={customer} />
    </div>
  )
}
