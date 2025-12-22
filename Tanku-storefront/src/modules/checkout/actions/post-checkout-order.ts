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

interface DataCart {
  customer_id: string
  cart_id: string
  producVariants: Array<{
    variant_id: string
    quantity: number
    original_total: number
    unit_price: number
  }>
}

export const postCheckoutOrder = async (
  data: CheckoutPayload,
  dataCart: DataCart
): Promise<any> => {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    
    console.log(`📝 [CHECKOUT] Enviando orden a: ${backendUrl}/store/checkout/add-order`)
    console.log(`📝 [CHECKOUT] Payment method: ${data.payment_method}`)
    console.log(`📝 [CHECKOUT] Cart ID: ${dataCart.cart_id}`)
    
    const response = await fetch(
      `${backendUrl}/store/checkout/add-order`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({dataForm: data, dataCart: dataCart}),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      console.error("❌ [CHECKOUT] Error del servidor:", errorData)
      throw new Error(errorData.error || errorData.message || "Error al procesar el pedido")
    }

    const result = await response.json()
    console.log(`✅ [CHECKOUT] Orden creada exitosamente:`, result.order?.id)
    return result
  } catch (error) {
    console.error("❌ [CHECKOUT] Error al enviar los datos del pedido:", error)
    throw error
  }
}
