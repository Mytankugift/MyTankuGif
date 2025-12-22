import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Carrito",
  description: "Ver tu carrito de compras",
}

export default async function Cart() {
  const cart = await retrieveCart()
  const customer = await retrieveCustomer()

  // Si no hay carrito, mostrar carrito vacío en lugar de 404
  // Esto puede pasar después de una compra exitosa o si el carrito expiró
  return <CartTemplate cart={cart} customer={customer} />
}
