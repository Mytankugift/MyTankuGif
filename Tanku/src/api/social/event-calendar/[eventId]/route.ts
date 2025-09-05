import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateEventCalendarWorkflow, deleteEventCalendarWorkflow } from "../../../../workflows/event-calendar"

interface UpdateEventCalendarBody {
  event_name: string
  event_date: string
  description?: string
  event_type: string
}

export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { eventId } = req.params
    const { event_name, event_date, description, event_type } = req.body as UpdateEventCalendarBody
    
    // Validate required fields
    if (!eventId) {
      return res.status(400).json({
        error: "eventId es requerido"
      })
    }
    
    if (!event_name) {
      return res.status(400).json({
        error: "event_name es requerido"
      })
    }
    
    if (!event_date) {
      return res.status(400).json({
        error: "event_date es requerido"
      })
    }
    
    // Validate date format
    const dateObj = new Date(event_date)
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        error: "event_date debe ser una fecha válida"
      })
    }
    
    // Execute the workflow
    const { result } = await updateEventCalendarWorkflow(req.scope).run({
      input: {
        id: eventId,
        event_name,
        event_date,
        description: description || undefined,
        event_type
      }
    })
    
    return res.status(200).json({
      success: true,
      event: result
    })
    
  } catch (error: any) {
    console.error("Error al actualizar evento del calendario:", error)
    
    // Handle specific errors
    if (error.message?.includes("obligatorios")) {
      return res.status(400).json({
        error: error.message
      })
    }
    
    if (error.message?.includes("no encontrado")) {
      return res.status(404).json({
        error: "Evento no encontrado"
      })
    }
    
    return res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    })
  }
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { eventId } = req.params
    
    // Validate required parameter
    if (!eventId) {
      return res.status(400).json({
        error: "eventId es requerido"
      })
    }
    
    // Execute the workflow
    const { result } = await deleteEventCalendarWorkflow(req.scope).run({
      input: {
        id: eventId
      }
    })
    
    return res.status(200).json({
      success: true,
      message: "Evento eliminado exitosamente"
    })
    
  } catch (error: any) {
    console.error("Error al eliminar evento del calendario:", error)
    
    // Handle specific errors
    if (error.message?.includes("obligatorio")) {
      return res.status(400).json({
        error: error.message
      })
    }
    
    if (error.message?.includes("no encontrado")) {
      return res.status(404).json({
        error: "Evento no encontrado"
      })
    }
    
    return res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    })
  }
}
