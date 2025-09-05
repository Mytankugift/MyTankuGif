export interface CreateEventCalendarData {
  customer_id: string
  event_name: string
  event_date: string
  description?: string
  event_type: string
}

export const createEventCalendar = async (eventData: CreateEventCalendarData) => {
  try {
    console.log("Enviando datos del evento:", eventData)
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/event-calendar`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
        body: JSON.stringify(eventData),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al crear el evento")
    }

    const data = await response.json()
    console.log("Evento creado exitosamente:", data)
    return data.event
  } catch (error) {
    console.error("Error al crear el evento:", error)
    throw error
  }
}