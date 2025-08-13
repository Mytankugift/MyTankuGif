import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"
import { Modules } from "@medusajs/framework/utils"

export interface GetUserStoriesInput {
  customer_id: string
}

export interface GetUserStoriesOutput {
  userStories: any[]
  friendsStories: any[]
}

export const getUserStoriesStep = createStep(
  "get-user-stories-step",
  async (input: GetUserStoriesInput, { container }) => {
    console.log("=== GETTING USER STORIES STEP ===")
    console.log("Input:", input)
    
    const socialModuleService: SocialModuleService = container.resolve(
      SOCIAL_MODULE
    )
    
    // 1. Obtener historias del usuario actual
    const userStories = await socialModuleService.listStoriesUsers({
      customer_id: input.customer_id,
      is_active: true
    })
    
    console.log("User stories found:", userStories.length)
    
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
    
    // 3. Obtener historias de los amigos
    let friendsStories: any[] = []
    
    if (friendIds.length > 0) {
      // Obtener historias de todos los amigos
      for (const friendId of friendIds) {
        const friendStories = await socialModuleService.listStoriesUsers({
          customer_id: friendId,
          is_active: true
        })
        friendsStories.push(...friendStories)
      }
    }
    
    console.log("Friends stories found:", friendsStories.length)
    
    // 4. Obtener archivos asociados y datos del customer para las historias del usuario
    const userStoriesWithFiles: any[] = []
    const customerService = container.resolve(Modules.CUSTOMER)
    
    for (const story of userStories) {
      const storyFiles = await socialModuleService.listStoryFiles({
        story_id: story.id
      })
      
      // Obtener información del customer
      let customerInfo: any = null
      try {
        customerInfo = await customerService.retrieveCustomer(story.customer_id)
      } catch (error) {
        console.error(`Error retrieving customer ${story.customer_id}:`, error)
      }
      
      userStoriesWithFiles.push({
        ...story,
        customer_name: customerInfo ? `${customerInfo.first_name || ''} ${customerInfo.last_name || ''}`.trim() || customerInfo.email : 'Usuario',
        customer_email: customerInfo?.email || '',
        files: storyFiles.sort((a: any, b: any) => a.order_index - b.order_index)
      })
    }
    
    // 5. Obtener archivos asociados y datos del customer para las historias de amigos
    const friendsStoriesWithFiles: any[] = []
    
    for (const story of friendsStories) {
      const storyFiles = await socialModuleService.listStoryFiles({
        story_id: story.id
      })
      
      // Obtener información del customer amigo
      let customerInfo: any = null
      try {
        customerInfo = await customerService.retrieveCustomer(story.customer_id)
      } catch (error) {
        console.error(`Error retrieving friend customer ${story.customer_id}:`, error)
      }
      
      friendsStoriesWithFiles.push({
        ...story,
        customer_name: customerInfo ? `${customerInfo.first_name || ''} ${customerInfo.last_name || ''}`.trim() || customerInfo.email : 'Amigo',
        customer_email: customerInfo?.email || '',
        files: storyFiles.sort((a: any, b: any) => a.order_index - b.order_index)
      })
    }
    
    const result: GetUserStoriesOutput = {
      userStories: userStoriesWithFiles,
      friendsStories: friendsStoriesWithFiles
    }
    
    console.log("Final result:", {
      userStoriesCount: result.userStories.length,
      friendsStoriesCount: result.friendsStories.length
    })
    
    if (result.userStories.length > 0) {
      console.log("User stories:", result.userStories[0].files)
    } else {
      console.log("No user stories found")
    }
    
    if (result.friendsStories.length > 0) {
      console.log("Friends stories:", result.friendsStories[0].files)
    } else {
      console.log("No friends stories found")
    }
    
    return new StepResponse(result)
  }
)
