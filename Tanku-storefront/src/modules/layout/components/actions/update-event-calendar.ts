export interface UpdateEventCalendarData {
  id: string
  event_name: string
  event_date: string
  description?: string
  event_type: string
}

export const updateEventCalendar = async (eventData: UpdateEventCalendarData) => {
  try {
    console.log("Actualizando evento:", eventData)
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/event-calendar/${eventData.id}`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
        body: JSON.stringify({
          event_name: eventData.event_name,
          event_date: eventData.event_date,
          description: eventData.description,
          event_type: eventData.event_type
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al actualizar el evento")
    }

    const data = await response.json()
    console.log("Evento actualizado exitosamente:", data)
    return data.event
  } catch (error) {
    console.error("Error al actualizar el evento:", error)
    throw error
  }
}
