"use server"

export interface StalkerTypingData {
  conversation_id: string
  customer_id: string
  is_typing: boolean
}

export interface StalkerTypingResponse {
  success: boolean
  message?: string
  error?: string
}

export async function updateStalkerTyping(
  typingData: StalkerTypingData
): Promise<StalkerTypingResponse> {
  try {

    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
    const response = await fetch(
      `${backendUrl}/stalker-chat/typing`,
      {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
        },
        body: JSON.stringify(typingData)
      }
    )

    const data = await response.json()

    if (data.success) {
      return {
        success: true,
        message: data.message
      }
    } else {
      return {
        success: false,
        error: data.error || "Failed to update typing status"
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}
