import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SOCIAL_MODULE } from "../../../../modules/social";
import SocialModuleService from "../../../../modules/social/service";

interface UnfriendBody {
  user_id: string
  friend_id: string
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { user_id, friend_id } = req.body as UnfriendBody
    if (!user_id || !friend_id) {
      return res.status(400).json({ error: "user_id y friend_id son requeridos" })
    }

    const socialModuleService: SocialModuleService = req.scope.resolve(SOCIAL_MODULE)

    // Buscar ambas direcciones de amistad
    const rel1 = await socialModuleService.listFriends({
      customer_id: user_id,
      friend_customer_id: friend_id
    })
    const rel2 = await socialModuleService.listFriends({
      customer_id: friend_id,
      friend_customer_id: user_id
    })

    const all = [...rel1, ...rel2]
    if (all.length === 0) {
      return res.status(404).json({ error: "Relación de amistad no encontrada" })
    }

    // Eliminar relaciones
    for (const r of all) {
      await socialModuleService.deleteFriends(r.id)
    }

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error("Error al eliminar amistad:", error)
    return res.status(500).json({ error: "Error interno del servidor", details: error.message })
  }
}


