import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"
import { Modules } from "@medusajs/framework/utils"

export interface GetUserAndFriendsPostersInput {
  customer_id: string
}

export interface GetUserAndFriendsPostersOutput {
  posterFeed: any[] // All posters combined and sorted by date
}

export const getUserAndFriendsPostersStep = createStep(
  "get-user-and-friends-posters-step",
  async (input: GetUserAndFriendsPostersInput, { container }) => {
    console.log("=== GETTING USER AND FRIENDS POSTERS STEP ===")
    console.log("Input:", input)
    
    const socialModuleService: SocialModuleService = container.resolve(
      SOCIAL_MODULE
    )
    const customerService = container.resolve(Modules.CUSTOMER)
    
    // 1. Obtener posters del usuario actual
    const userPosters = await socialModuleService.listPosters({
      customer_id: input.customer_id,
      is_active: true
    })
    
    console.log("User posters found:", userPosters.length)
    
    // 2. Obtener amigos del usuario (solicitudes aceptadas)
    const friendRequests = await socialModuleService.listFriendRequests({
      status: "accepted"
    })
    
    // Filtrar para obtener los IDs de los amigos
    const friendIds: string[] = []
    
    for (const request of friendRequests) {
      if (request.sender_id === input.customer_id) {
        // El usuario es el sender, el amigo es el receiver
        friendIds.push(request.receiver_id)
      } else if (request.receiver_id === input.customer_id) {
        // El usuario es el receiver, el amigo es el sender
        friendIds.push(request.sender_id)
      }
    }
    
    console.log("Friend IDs found:", friendIds)
    
    // 3. Obtener posters de los amigos
    let friendsPosters: any[] = []
    
    if (friendIds.length > 0) {
      // Obtener posters de todos los amigos
      for (const friendId of friendIds) {
        const friendPosters = await socialModuleService.listPosters({
          customer_id: friendId,
          is_active: true
        })
        friendsPosters.push(...friendPosters)
      }
    }
    
    console.log("Friends posters found:", friendsPosters.length)
    
    // 4. Obtener información del customer para los posters del usuario
    const userPostersWithInfo: any[] = []
    
    for (const poster of userPosters) {
      // Obtener información del customer
      let customerInfo: any = null
      try {
        customerInfo = await customerService.retrieveCustomer(poster.customer_id)
      } catch (error) {
        console.error(`Error retrieving customer ${poster.customer_id}:`, error)
      }
      
      userPostersWithInfo.push({
        ...poster,
        customer_name: customerInfo ? `${customerInfo.first_name || ''} ${customerInfo.last_name || ''}`.trim() || customerInfo.email : 'Usuario',
        customer_email: customerInfo?.email || '',
      })
    }
    
    // 5. Obtener información del customer para los posters de amigos
    const friendsPostersWithInfo: any[] = []
    
    for (const poster of friendsPosters) {
      // Obtener información del customer amigo
      let customerInfo: any = null
      try {
        customerInfo = await customerService.retrieveCustomer(poster.customer_id)
      } catch (error) {
        console.error(`Error retrieving friend customer ${poster.customer_id}:`, error)
      }
      
      friendsPostersWithInfo.push({
        ...poster,
        customer_name: customerInfo ? `${customerInfo.first_name || ''} ${customerInfo.last_name || ''}`.trim() || customerInfo.email : 'Amigo',
        customer_email: customerInfo?.email || '',
      })
    }
    
    // 6. Combinar y ordenar todos los posters por fecha (más recientes primero)
    const combinedPosters = [...userPostersWithInfo, ...friendsPostersWithInfo]
      .sort((a, b) => {
        // Ordenar por created_at descendente (más recientes primero)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    
    const result: GetUserAndFriendsPostersOutput = {
      posterFeed:combinedPosters
    }
    

    return new StepResponse(result)
  }
)
