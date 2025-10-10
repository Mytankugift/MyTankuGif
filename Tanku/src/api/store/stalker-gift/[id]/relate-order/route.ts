import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateStalkerGiftWorkflow } from "../../../../../workflows/stalker_gift"

export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {

  try {
    const { id } = req.params as { id: string }
    const {
      customer_id,
      payment_status = "recibida"
    } = req.body as {
      customer_id: string
      payment_status?: string
    }

    // Validaciones básicas
    if (!id) {
      console.error('ID del StalkerGift requerido')
      return res.status(400).json({
        error: "ID del StalkerGift es requerido"
      })
    }

    if (!customer_id) {
      console.error('ID de cliente requerido')
      return res.status(400).json({
        error: "customer_id es requerido"
      })
    }

    

    // Ejecutar el workflow para actualizar el StalkerGift
    const { result } = await updateStalkerGiftWorkflow(req.scope).run({
      input: {
        stalker_gift_id: id,
        customer_id,
        payment_status
      }
    })

    console.log('Workflow ejecutado exitosamente:', result)

    res.status(200).json({
      success: true,
      stalkerGift: result,
      message: "StalkerGift actualizado exitosamente"
    })

  } catch (error) {
    console.error('Error en PUT /store/stalker-gift/[id]/relate-order:', error)
    
    res.status(500).json({
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    })
  }
}
