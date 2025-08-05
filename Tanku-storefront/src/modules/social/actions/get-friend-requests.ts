export interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: string
  message?: string
  created_at: string
}

export const getFriendRequests = async (userId: string) => {
  try {
    console.log("Obteniendo solicitudes de amistad para:", userId)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/friends/get-friend-requests?user_id=${userId}`,
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
    
    console.log("Response status:", response.status)
    const data = await response.json()
    console.log("Friend requests data:", data)
    
    if (!response.ok) {
      throw new Error(data.error || "Error al obtener solicitudes de amistad")
    }
    
    return {
      sent: data.sent_requests || [],
      received: data.received_requests || []
    }
  } catch (error) {
    console.error("Error al obtener solicitudes de amistad:", error)
    return {
      sent: [],
      received: []
    }
  }
}
