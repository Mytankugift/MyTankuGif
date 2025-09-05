import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createEventCalendarWorkflow, getUserEventsWorkflow, updateEventCalendarWorkflow, deleteEventCalendarWorkflow } from "../../../workflows/event-calendar"

interface CreateEventCalendarBody {
  customer_id: string
  event_name: string
  event_date: string
  description?: string
  event_type: string
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { customer_id, event_name, event_date, description, event_type } = req.body as CreateEventCalendarBody
    
    // Validate required fields
    if (!customer_id) {
      return res.status(400).json({
        error: "customer_id es requerido"
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
    const { result } = await createEventCalendarWorkflow(req.scope).run({
      input: {
        customer_id,
        event_name,
        event_date,
        description: description || undefined,
        event_type
      }
    })
    
    return res.status(201).json({
      success: true,
      event: result
    })
    
  } catch (error: any) {
    console.error("Error al crear evento del calendario:", error)
    
    // Handle specific errors
    if (error.message?.includes("obligatorios")) {
      return res.status(400).json({
        error: error.message
      })
    }
    
    if (error.message?.includes("not found")) {
      return res.status(404).json({
        error: "Usuario no encontrado"
      })
    }
    
    return res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    })
  }
}