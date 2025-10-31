import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SOCIAL_MODULE } from "../../../../../modules/social";
import SocialModuleService from "../../../../../modules/social/service";

interface CleanupPairBody {
  user_a: string
  user_b: string
}

// Elimina TODAS las friend_requests entre un par (en ambos sentidos) y cualquier relación de amistad existente
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { user_a, user_b } = req.body as CleanupPairBody
    if (!user_a || !user_b) {
      return res.status(400).json({ error: "user_a y user_b son requeridos" })
    }

    const socialModuleService: SocialModuleService = req.scope.resolve(SOCIAL_MODULE)

    // Borrar friend_requests en ambos sentidos, sin importar status
    const reqsAB = await socialModuleService.listFriendRequests({ sender_id: user_a, receiver_id: user_b })
    const reqsBA = await socialModuleService.listFriendRequests({ sender_id: user_b, receiver_id: user_a })
    let removedRequests = 0
    for (const r of [...reqsAB, ...reqsBA]) {
      await socialModuleService.deleteFriendRequests(r.id)
      removedRequests++
    }

    // Borrar friendships en ambos sentidos
    const frAB = await socialModuleService.listFriends({ customer_id: user_a, friend_customer_id: user_b })
    const frBA = await socialModuleService.listFriends({ customer_id: user_b, friend_customer_id: user_a })
    let removedFriends = 0
    for (const f of [...frAB, ...frBA]) {
      await socialModuleService.deleteFriends(f.id)
      removedFriends++
    }

    return res.status(200).json({ success: true, removedRequests, removedFriends })
  } catch (e: any) {
    console.error("cleanup-pair error", e)
    return res.status(500).json({ success: false, error: e.message })
  }
}


