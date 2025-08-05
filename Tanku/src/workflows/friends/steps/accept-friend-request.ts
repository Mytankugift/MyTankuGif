import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { SOCIAL_MODULE } from "../../../modules/social";
import SocialModuleService from "../../../modules/social/service";

export interface AcceptFriendRequestInput {
  request_id: string
  receiver_id: string
}

export const acceptFriendRequestStep = createStep(
  "accept-friend-request-step",
  async (input: AcceptFriendRequestInput, { container }) => {
    console.log("ACEPTANDO SOLICITUD DE AMISTAD:", input)

    const socialModuleService: SocialModuleService = container.resolve(
        SOCIAL_MODULE
    );

    // Buscar la solicitud de amistad específica
    const friendRequests = await socialModuleService.listFriendRequests({
      receiver_id: input.receiver_id,
      status: "pending"
    })

    const friendRequest = friendRequests.find(req => 
      req.sender_id === input.request_id || 
      (req.receiver_id === input.receiver_id && req.sender_id === input.request_id)
    )

    if (!friendRequest) {
      throw new Error("Solicitud de amistad no encontrada o ya procesada")
    }

    // Actualizar el estado de la solicitud a "accepted"
    const updatedRequest = await socialModuleService.updateFriendRequests({
      id: friendRequest.id,
      status: "accepted"
    })

    console.log("SOLICITUD DE AMISTAD ACEPTADA:", updatedRequest)
    
    return new StepResponse(
      {
        id: updatedRequest.id,
        sender_id: updatedRequest.sender_id,
        receiver_id: updatedRequest.receiver_id,
        status: updatedRequest.status,
        message: updatedRequest.message,
        updated_at: updatedRequest.updated_at
      },
      // Compensation function to revert the acceptance
      async () => {
        await socialModuleService.updateFriendRequests({
          id: friendRequest.id,
          status: "pending"
        })
      }
    )
  }
)
