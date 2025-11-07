import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SOCIAL_MODULE } from "../../../../../modules/social";
import SocialModuleService from "../../../../../modules/social/service";

// Limpia solicitudes pendientes duplicadas entre el mismo par (sender_id, receiver_id)
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const socialModuleService: SocialModuleService = req.scope.resolve(SOCIAL_MODULE)

    const pending = await socialModuleService.listFriendRequests({ status: "pending" })
    const byPair = new Map<string, any[]>()
    for (const r of pending) {
      const key = `${r.sender_id}__${r.receiver_id}`
      const arr = byPair.get(key) || []
      arr.push(r)
      byPair.set(key, arr)
    }

    let removed = 0
    for (const [, arr] of byPair) {
      if (arr.length <= 1) continue
      // Ordenar por created_at y conservar la más reciente
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const toDelete = arr.slice(1)
      for (const r of toDelete) {
        await socialModuleService.deleteFriendRequests(r.id)
        removed++
      }
    }

    return res.status(200).json({ success: true, removed })
  } catch (e: any) {
    console.error("cleanup-pending error", e)
    return res.status(500).json({ success: false, error: e.message })
  }
}


