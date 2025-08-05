import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { SOCIAL_MODULE } from "../../../modules/social";
import SocialModuleService from "../../../modules/social/service";

export interface SendFriendRequestInput {
  sender_id: string
  receiver_id: string
  message?: string
}

export const sendFriendRequestStep = createStep(
  "send-friend-request-step",
  async (input: SendFriendRequestInput, { container }) => {
    

    const socialModuleService: SocialModuleService = container.resolve(
        SOCIAL_MODULE
      );


    
    // Verificar que no exista ya una solicitud entre estos usuarios
    const existingRequest = await socialModuleService.listFriendRequests({
      sender_id: input.sender_id,
      receiver_id: input.receiver_id
    })
    
    if (existingRequest.length > 0) {
      throw new Error("Friend request already exists between these users")
    }
    
    // Crear la solicitud de amistad
    const friendRequest = await socialModuleService.createFriendRequests({
      sender_id: input.sender_id,
      receiver_id: input.receiver_id,
      status: "pending",
      message: input.message || null
    })

    
    
    return new StepResponse(
      {
        id: friendRequest.id,
        sender_id: friendRequest.sender_id,
        receiver_id: friendRequest.receiver_id,
        status: friendRequest.status,
        message: friendRequest.message,
        created_at: friendRequest.created_at
      },
      // Compensation function to undo the friend request creation
      async () => {
        await socialModuleService.deleteFriendRequests(friendRequest.id)
      }
    )
  }
)