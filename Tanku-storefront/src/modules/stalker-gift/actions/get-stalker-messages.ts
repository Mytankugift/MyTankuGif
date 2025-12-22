"use server"

export interface StalkerMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: string
  created_at: string
  is_edited: boolean
  is_deleted: boolean
  status: string
  status_at: string
}

export interface GetStalkerMessagesResponse {
  success: boolean
  data?: {
    messages: StalkerMessage[]
    conversation_id: string
    total: number
    has_more: boolean
  }
  error?: string
}

export async function getStalkerMessages(
  conversationId: string,
  customerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<GetStalkerMessagesResponse> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
    const response = await fetch(
      `${backendUrl}/stalker-chat/messages?conversation_id=${conversationId}&customer_id=${customerId}&limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
        },
      }
    )

    const data = await response.json()

    if (data.success && data.data) {
      return {
        success: true,
        data: data.data
      }
    } else {
      return {
        success: false,
        error: data.error || "Failed to get messages"
      }
    }

  } catch (error) {
    console.error(`[STALKER CHAT ACTION] Error getting messages:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}
