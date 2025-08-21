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

    // Crear relaciones bidireccionales en la tabla friend
    const friendshipDate = new Date()
    
    // Insertar relación para el primer usuario (sender -> receiver)
    const friendship1 = await socialModuleService.createFriends({
      customer_id: friendRequest.sender_id,
      friend_customer_id: friendRequest.receiver_id,
      role: "friend",
      friendship_date: friendshipDate,
      is_favorite: false
    })

    // Insertar relación para el segundo usuario (receiver -> sender)
    const friendship2 = await socialModuleService.createFriends({
      customer_id: friendRequest.receiver_id,
      friend_customer_id: friendRequest.sender_id,
      role: "friend",
      friendship_date: friendshipDate,
      is_favorite: false
    })

    console.log("RELACIONES DE AMISTAD CREADAS:", {
      friendship1: friendship1.id,
      friendship2: friendship2.id
    })
    
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
        // Revertir el estado de la solicitud
        await socialModuleService.updateFriendRequests({
          id: friendRequest.id,
          status: "pending"
        })
        
        // Eliminar las relaciones de amistad creadas
        try {
          await socialModuleService.deleteFriends(friendship1.id)
          await socialModuleService.deleteFriends(friendship2.id)
        } catch (error) {
          console.error("Error al eliminar relaciones de amistad en compensación:", error)
        }
      }
    )
  }
)
