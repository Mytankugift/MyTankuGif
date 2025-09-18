"use server"

export interface CreateStalkerGiftData {
  total_amount: number
  first_name: string
  phone: string
  email: string
  alias: string
  recipient_name: string
  contact_methods: any[]
  products: any[]
  message?: string
  payment_method?: string
  payment_status?: string
}

export interface StalkerGiftResponse {
  id: string
  total_amount: number
  first_name: string
  phone: string
  email: string
  alias: string
  recipient_name: string
  contact_methods: any
  products: any
  message?: string
  payment_method: string
  payment_status: string
  transaction_id?: string
  created_at: string
  updated_at: string
}

export interface CreateStalkerGiftResponse {
  stalkerGift: StalkerGiftResponse
  invitationUrl: string
  invitationText: string
  message: string
}

export async function createStalkerGift(
  data: CreateStalkerGiftData
): Promise<CreateStalkerGiftResponse> {
  const url = `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/stalker-gift`
  
  console.log('=== CREANDO STALKER GIFT ===')
  console.log('URL:', url)
  console.log('Data:', data)

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify(data),
    })

    console.log('Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response:', errorText)
      throw new Error(`Error creating StalkerGift: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('StalkerGift creado exitosamente:', result)
    
    return result
  } catch (error) {
    console.error("Error en createStalkerGift:", error)
    throw error
  }
}
