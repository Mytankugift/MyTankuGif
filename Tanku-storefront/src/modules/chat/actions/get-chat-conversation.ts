export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: string
  file_url?: string
  reply_to_id?: string
  is_edited: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface ChatConversation {
  id: string
  conversation_type: string
  relation_id: string
  title?: string
  created_by: string
  last_message_id?: string
  last_message_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GetChatConversationResponse {
  conversation: ChatConversation
  friendship: any
  messages: ChatMessage[]
  total_count: number
  has_more: boolean
}

export const getChatConversation = async (
  customerId: string,
  friendCustomerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<GetChatConversationResponse> => {
  try {
console.log("customerId", customerId)
console.log("friendCustomerId", friendCustomerId)
console.log("limit", limit)
console.log("offset", offset)

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/chat/get-conversation?customer_id=${customerId}&friend_customer_id=${friendCustomerId}&limit=${limit}&offset=${offset}`,
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

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Error al obtener conversación")
    }

    return data
  } catch (error) {
    console.error("Error al obtener conversación:", error)
    throw error
  }
}
