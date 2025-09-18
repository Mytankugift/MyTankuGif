import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STALKER_GIFT_MODULE } from "../../../../modules/stalker_gift"
import StalkerGiftModuleService from "../../../../modules/stalker_gift/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  console.log('=== API ROUTE: GET /store/stalker-gift/[id] ===')
  
  const { id } = req.params
  console.log('StalkerGift ID:', id)

  try {
    // Obtener el servicio del módulo
    const stalkerGiftModuleService: StalkerGiftModuleService = req.scope.resolve(STALKER_GIFT_MODULE)
    
    // Buscar el StalkerGift por ID
    const stalkerGift = await stalkerGiftModuleService.retrieveStalkerGift(id)
    
    if (!stalkerGift) {
      console.log('StalkerGift no encontrado con ID:', id)
      return res.status(404).json({
        error: "StalkerGift no encontrado",
        message: "No se encontró ningún StalkerGift con el ID proporcionado"
      })
    }

    console.log('StalkerGift encontrado:', stalkerGift)

    res.status(200).json({
      stalkerGift,
      message: "StalkerGift obtenido exitosamente"
    })

  } catch (error) {
    console.error('Error en GET /store/stalker-gift/[id]:', error)
    
    res.status(500).json({
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    })
  }
}
