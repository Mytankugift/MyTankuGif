export interface SellerOrder {
  id: string
  cart_id: string
  email: string
  payment_method: string
  total_amount: number
  first_name: string
  last_name: string
  address_1: string
  address_2?: string
  company?: string
  postal_code: string
  city: string
  country_code: string
  province: string
  phone: string
  created_at: string
  updated_at: string
  status: {
    id: string
    status: "pendiente" | "procesando" | "enviado" | "entregado" | "cancelado"
  }
  shipping_address: {
    id: string
    first_name: string
    last_name: string
    address_1: string
    address_2?: string
    company?: string
    postal_code: string
    city: string
    country_code: string
    province: string
    phone: string
  }
  orderVariants: Array<{
    id: string
    variant_id: string
    quantity: number
    unit_price: number
    original_total: number
  }>
}

export const getSellerOrders = async (customerId: string) => {
  try {
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/seller/orders/get-seller-orders?customerId=${customerId}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al obtener las órdenes del vendedor")
    }

    const data = await response.json()

    return data.orders
  } catch (error) {
    console.error("Error al obtener las órdenes del vendedor:", error)
    throw error
  }
}
