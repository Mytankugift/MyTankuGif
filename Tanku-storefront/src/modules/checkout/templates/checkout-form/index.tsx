"use client"
import { HttpTypes } from "@medusajs/types"
import dynamic from "next/dynamic"

const FormTanku = dynamic(
  () => import("@modules/checkout/components/form-tanku"),
  { ssr: false }
)

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
    <div className="w-full">
      <FormTanku cart={cart} customer={customer} />
    </div>
  )
}
