"use server"

export interface SendStalkerMessageData {
  conversation_id: string
  sender_id: string
  content: string
  message_type?: string
  reply_to_id?: string
}

export interface SendStalkerMessageResponse {
  success: boolean
  data?: {
    message: {
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
  }
  error?: string
}

export async function sendStalkerMessage(
  messageData: SendStalkerMessageData
): Promise<SendStalkerMessageResponse> {
  try {

    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
    const response = await fetch(
      `${backendUrl}/stalker-chat/messages`,
      {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
        },
        body: JSON.stringify(messageData)
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
        error: data.error || "Failed to send message"
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}
