"use server"

export interface CustomerStalkerGift {
  id: string
  total_amount: number
  first_name: string
  phone: string
  email: string
  alias: string
  recipient_name: string
  contact_methods: any[]
  products: any[]
  message?: string
  payment_method: string
  payment_status: string
  transaction_id?: string
  customer_giver_id?: string
  customer_recipient_id?: string
  created_at: string
  updated_at: string
  isGiver: boolean // Indica si el customer es quien envió el regalo
}

export async function getCustomerStalkerGifts(customerId: string): Promise<CustomerStalkerGift[]> {
  const url = `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/stalker-gift/customer/${customerId}`
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
      
        return []
      }
      const errorText = await response.text()
      console.error('Error response:', errorText)
      throw new Error(`Error getting customer StalkerGifts: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    
    return result.stalkerGifts || []
  } catch (error) {
    console.error("Error en getCustomerStalkerGifts:", error)
    return []
  }
}
