import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendFriendRequestWorkflow } from "../../../../workflows/friends"

interface SendFriendRequestBody {
  sender_id: string
  receiver_id: string
  message?: string
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { sender_id, receiver_id, message } = req.body as SendFriendRequestBody
    
   
    // Verificar que receiver_id esté presente
    if (!receiver_id) {
      return res.status(400).json({
        error: "receiver_id es requerido"
      })
    }
    
    // Verificar que no se envíe solicitud a sí mismo
    if (sender_id === receiver_id) {
      return res.status(400).json({
        error: "No puedes enviarte una solicitud de amistad a ti mismo"
      })
    }
    
    // Ejecutar el workflow de envío de solicitud de amistad
    const { result } = await sendFriendRequestWorkflow(req.scope).run({
      input: {
        sender_id,
        receiver_id,
        message: message || undefined
      }
    })
    
    return res.status(201).json({
      success: true,
      friend_request: result
    })
    
  } catch (error: any) {
    console.error("Error al enviar solicitud de amistad:", error)
    
    // Manejar errores específicos
    if (error.message?.includes("not found")) {
      return res.status(404).json({
        error: "Usuario no encontrado"
      })
    }
    
    if (error.message?.includes("already exists")) {
      return res.status(409).json({
        error: "Ya existe una solicitud de amistad entre estos usuarios"
      })
    }
    
    return res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    })
  }
}