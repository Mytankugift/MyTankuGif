import { HttpTypes } from "@medusajs/types"

export interface CheckoutPayload {
  shipping_address: AddressPayload
  billing_address: AddressPayload
  email: string
  payment_method: string
  cart_id?: string
}

export interface AddressPayload {
  first_name?: string
  last_name?: string
  address_1?: string
  address_2?: string
  company?: string
  postal_code?: string
  city?: string
  country_code?: string
  province?: string
  phone?: string
}

/**
 * Envía los datos del formulario de checkout al backend
 * @param data - Datos del formulario de checkout
 * @returns Promesa con la respuesta del servidor
 */
export const postCheckoutOrder = async (
  data: CheckoutPayload
): Promise<any> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/checkout/add-order`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
        },
        body: JSON.stringify(data),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al procesar el pedido")
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error al enviar los datos del pedido:", error)
    throw error
  }
}