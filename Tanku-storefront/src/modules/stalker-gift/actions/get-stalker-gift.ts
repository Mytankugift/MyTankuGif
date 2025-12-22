"use server"

export interface StalkerGiftData {
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
  created_at: string
  updated_at: string
}

export async function getStalkerGiftById(id: string): Promise<StalkerGiftData | null> {
  const url = `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/stalker-gift/${id}`
  
  console.log('=== OBTENIENDO STALKER GIFT ===')
  console.log('URL:', url)
  console.log('ID:', id)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
    })

    console.log('Response status:', response.status)

    if (!response.ok) {
      if (response.status === 404) {
        console.log('StalkerGift no encontrado')
        return null
      }
      const errorText = await response.text()
      console.error('Error response:', errorText)
      throw new Error(`Error getting StalkerGift: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('StalkerGift obtenido exitosamente:', result)
    
    return result.stalkerGift
  } catch (error) {
    console.error("Error en getStalkerGiftById:", error)
    return null
  }
}
