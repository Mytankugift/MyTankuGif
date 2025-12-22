export const deleteEventCalendar = async (eventId: string) => {
  try {
    console.log("Eliminando evento:", eventId)
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/event-calendar/${eventId}`,
      {
        method: "DELETE",
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
      throw new Error(errorData.error || "Error al eliminar el evento")
    }

    const data = await response.json()
    console.log("Evento eliminado exitosamente:", data)
    return data.success
  } catch (error) {
    console.error("Error al eliminar el evento:", error)
    throw error
  }
}
