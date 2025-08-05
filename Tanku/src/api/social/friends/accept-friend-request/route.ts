import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { acceptFriendRequestWorkflow } from "../../../../workflows/friends"

interface AcceptFriendRequestBody {
  sender_id: string
  receiver_id: string
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { sender_id, receiver_id } = req.body as AcceptFriendRequestBody
    
    // Verificar que sender_id y receiver_id estén presentes
    if (!sender_id || !receiver_id) {
      return res.status(400).json({
        error: "sender_id y receiver_id son requeridos"
      })
    }
    
    // Ejecutar el workflow de aceptación de solicitud de amistad
    const { result } = await acceptFriendRequestWorkflow(req.scope).run({
      input: {
        request_id: sender_id,
        receiver_id: receiver_id
      }
    })
    
    return res.status(200).json({
      success: true,
      friend_request: result
    })
    
  } catch (error: any) {
    console.error("Error al aceptar solicitud de amistad:", error)
    
    // Manejar errores específicos
    if (error.message?.includes("no encontrada")) {
      return res.status(404).json({
        error: "Solicitud de amistad no encontrada o ya procesada"
      })
    }
    
    return res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    })
  }
}
