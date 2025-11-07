import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SOCIAL_MODULE } from "../../../../../modules/social";
import SocialModuleService from "../../../../../modules/social/service";
import { Modules } from "@medusajs/framework/utils";
import { PERSONAL_INFORMATION_MODULE } from "../../../../../modules/personal_information";
import PersonalInformationService from "../../../../../modules/personal_information/service";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { user_id } = req.params
    if (!user_id) {
      return res.status(400).json({ error: "user_id es requerido" })
    }

    const socialModuleService: SocialModuleService = req.scope.resolve(SOCIAL_MODULE)
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
    const personalInfoService: PersonalInformationService = req.scope.resolve(PERSONAL_INFORMATION_MODULE)

    // Relaciones donde user es el propietario (bidireccionalidad ya debería existir)
    const friends = await socialModuleService.listFriends({ customer_id: user_id as string })

    const detailed = await Promise.all(
      friends.map(async (f) => {
        const friendId = f.friend_customer_id
        const customer = await customerModuleService.retrieveCustomer(friendId)
        const pi = await personalInfoService.listPersonalInformations({ customer_id: friendId })
        return {
          id: f.id,
          customer_id: f.customer_id,
          friend_customer_id: friendId,
          role: f.role,
          friendship_date: f.friendship_date,
          is_favorite: f.is_favorite,
          friend: {
            ...customer,
            avatar_url: pi?.[0]?.avatar_url || null,
            pseudonym: (pi?.[0] as any)?.pseudonym || null,
          },
        }
      })
    )

    return res.status(200).json({ success: true, friends: detailed })
  } catch (e: any) {
    console.error("list friends error", e)
    return res.status(500).json({ error: e.message })
  }
}


