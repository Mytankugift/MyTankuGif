import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getUserEventsWorkflow } from "../../../../../workflows/event-calendar"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { customerId } = req.params
    
    // Validate required parameter
    if (!customerId) {
      return res.status(400).json({
        error: "customerId es requerido"
      })
    }
    
    // Execute the workflow
    const { result } = await getUserEventsWorkflow(req.scope).run({
      input: {
        customer_id: customerId
      }
    })
    
    return res.status(200).json({
      success: true,
      events: result
    })
    
  } catch (error: any) {
    console.error("Error al obtener eventos del usuario:", error)
    
    // Handle specific errors
    if (error.message?.includes("obligatorio")) {
      return res.status(400).json({
        error: error.message
      })
    }
    
    return res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    })
  }
}
