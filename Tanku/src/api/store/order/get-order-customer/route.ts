
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getCustomerOrdersWorkflow } from "../../../../workflows/order_tanku"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { customerId } = req.query
    
    // Validate required parameter
    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({
        error: "customerId es requerido"
      })
    }
    
    // Execute the workflow
    const { result } = await getCustomerOrdersWorkflow(req.scope).run({
      input: {
        customer_id: customerId
      }
    })
    
    return res.status(200).json({
      success: true,
      orders: result
    })
    
  } catch (error: any) {
    console.error("Error al obtener órdenes del cliente:", error)
    
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
