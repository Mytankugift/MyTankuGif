export interface SendFriendRequestData {
  sender_id: string
  receiver_id: string
  message?: string
}

export const sendFriendRequest = async (data: SendFriendRequestData) => {
  try {
    console.log("Enviando solicitud de amistad:", data)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/friends/send-friend-request`,
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
    
    console.log("Response status:", response.status)
    const result = await response.json()
    console.log("Response data:", result)
    
    if (!response.ok) {
      throw new Error(result.error || "Error al enviar solicitud de amistad")
    }
    
    return result
  } catch (error) {
    console.error("Error al enviar solicitud de amistad:", error)
    throw error
  }
}
