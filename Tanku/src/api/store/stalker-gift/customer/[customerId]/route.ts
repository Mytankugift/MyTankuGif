import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getCustomerStalkerGiftsWorkflow } from "../../../../../workflows/stalker_gift"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
 
  try {
    const { customerId } = req.params as { customerId: string }

    // Validaciones básicas
    if (!customerId) {
      console.error('Customer ID requerido')
      return res.status(400).json({
        error: "Customer ID es requerido"
      })
    }


    // Ejecutar el workflow para obtener los StalkerGifts del customer
    const { result } = await getCustomerStalkerGiftsWorkflow(req.scope).run({
      input: {
        customer_id: customerId
      }
    })

  

    res.status(200).json({
      stalkerGifts: result,
      message: "StalkerGifts obtenidos exitosamente"
    })

  } catch (error) {
    console.error('Error en GET /store/stalker-gift/customer/[customerId]:', error)
    
    res.status(500).json({
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    })
  }
}
