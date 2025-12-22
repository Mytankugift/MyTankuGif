"use server"

export interface StalkerConversationData {
  conversation: {
    id: string
    stalker_gift_id: string
    is_enabled: boolean
    enabled_at: string | null
    last_message_at: string | null
  }
  stalker_gift: {
    id: string
    alias: string
    recipient_name: string
    total_amount: number
    products: any
    message?: string
    payment_status: string
  }
  user_role: 'giver' | 'recipient'
  other_participant_id: string | null
}

export interface GetStalkerConversationResponse {
  success: boolean
  data?: StalkerConversationData
  error?: string
}

export async function getStalkerConversation(
  stalkerGiftId: string,
  customerId: string
): Promise<GetStalkerConversationResponse> {
  try {
    console.log(`[STALKER CHAT ACTION] Getting conversation for StalkerGift ${stalkerGiftId}, customer ${customerId}`)

    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
    const response = await fetch(
      `${backendUrl}/stalker-chat/conversations?stalker_gift_id=${stalkerGiftId}&customer_id=${customerId}`,
      {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
        },
      }
    )

    const data = await response.json()

    console.log(`[STALKER CHAT ACTION] Response:`, data)

    if (data.success && data.data) {
      return {
        success: true,
        data: data.data
      }
    } else {
      return {
        success: false,
        error: data.error || "Failed to get conversation"
      }
    }

  } catch (error) {
    console.error(`[STALKER CHAT ACTION] Error getting conversation:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}
