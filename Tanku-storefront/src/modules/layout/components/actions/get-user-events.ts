export interface UserEvent {
  id: string
  customer_id: string
  event_name: string
  event_date: string
  description?: string
  location?: string
  created_at: string
  updated_at: string
}

export const getUserEvents = async (customerId: string) => {
  try {
    console.log("Obteniendo eventos del usuario:", customerId)
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/event-calendar/user/${customerId}`,
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

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al obtener los eventos")
    }

    const data = await response.json()
    console.log("Eventos obtenidos exitosamente:", data)
    return data.events
  } catch (error) {
    console.error("Error al obtener los eventos:", error)
    throw error
  }
}
