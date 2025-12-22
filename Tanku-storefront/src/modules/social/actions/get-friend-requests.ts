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
   
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/friends/get-friend-requests/${userId}`,
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
    console.log("friend-requests data", data)
    
    if (!response.ok) {
      throw new Error(data.error || "Error al obtener solicitudes de amistad")
    }
    
    return {
      sent: data.sent || [],
      received: data.received || []
    }
  } catch (error: any) {
    // Solo mostrar error si no es un error de red esperado o 404
    if (error?.message && !error.message.includes('Failed to fetch') && !error.message.includes('404')) {
      console.warn("Error al obtener solicitudes de amistad:", error?.message || error)
    }
    return {
      sent: [],
      received: []
    }
  }
}
