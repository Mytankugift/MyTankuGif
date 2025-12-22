export interface SendMessageRequest {
  conversation_id: string
  sender_id: string
  content: string
  message_type?: string
  file_url?: string
  reply_to_id?: string
}

export interface SendMessageResponse {
  message: ChatMessage
  success: boolean
}

import { ChatMessage } from "./get-chat-conversation"

export const sendChatMessage = async (data: SendMessageRequest): Promise<SendMessageResponse> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/chat/send-message`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
        body: JSON.stringify(data)
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || "Error al enviar mensaje")
    }

    return result
  } catch (error) {
    console.error("Error al enviar mensaje:", error)
    throw error
  }
}
