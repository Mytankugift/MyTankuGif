import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SOCIAL_MODULE } from "../../../../../modules/social";
import SocialModuleService from "../../../../../modules/social/service";

// ADVERTENCIA: Limpieza global de solicitudes y amistades. Úsalo solo en dev.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const socialModuleService: SocialModuleService = req.scope.resolve(SOCIAL_MODULE)

    // Eliminar TODAS las friend_requests (cualquier estado)
    const allRequests = await socialModuleService.listFriendRequests({})
    let removedRequests = 0
    for (const r of allRequests) {
      await socialModuleService.deleteFriendRequests(r.id)
      removedRequests++
    }

    // Eliminar TODAS las friendships
    const allFriends = await socialModuleService.listFriends({})
    let removedFriends = 0
    for (const f of allFriends) {
      await socialModuleService.deleteFriends(f.id)
      removedFriends++
    }

    return res.status(200).json({ success: true, removedRequests, removedFriends })
  } catch (e: any) {
    console.error("cleanup-all error", e)
    return res.status(500).json({ success: false, error: e.message })
  }
}


