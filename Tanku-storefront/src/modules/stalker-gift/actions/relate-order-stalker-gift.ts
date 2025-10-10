"use server"

export interface RelateOrderStalkerGiftData {
  customerId: string
  stalkerGiftId: string
}

export interface RelateOrderStalkerGiftResponse {
  success: boolean
  stalkerGift: any
  message: string
}

export async function relateOrderStalkerGift(
  customerId: string,
  stalkerGiftId: string,
): Promise<RelateOrderStalkerGiftResponse> {
  const url = `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/stalker-gift/${stalkerGiftId}/relate-order`


  const requestData = {
    customer_id: customerId,
    stalker_gift_id: stalkerGiftId,
    payment_status: "recibida"
  }

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error relating order to StalkerGift: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    
    return result
  } catch (error) {
    throw error
  }
}
