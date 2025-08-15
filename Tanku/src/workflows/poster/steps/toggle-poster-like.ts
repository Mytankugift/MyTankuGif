import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export interface TogglePosterLikeInput {
  poster_id: string
  customer_id: string
}

export interface TogglePosterLikeOutput {
  action: "added" | "removed"
  reaction?: any
  likes_count: number
}

export const togglePosterLikeStep = createStep(
  "toggle-poster-like-step",
  async (input: TogglePosterLikeInput, { container }) => {
    console.log("=== TOGGLING POSTER LIKE STEP ===")
    console.log("Input:", input)
    
    const socialModuleService: SocialModuleService = container.resolve(
      SOCIAL_MODULE
    )
    
    // 1. Verificar si ya existe una reacción "like" del usuario para este poster
    const existingReaction = await socialModuleService.listPosterReactions({
      poster_id: input.poster_id,
      customer_id: input.customer_id,
      reaction_type: "like"
    })
    
    let action: "added" | "removed"
    let reaction: any = null
    
    if (existingReaction.length > 0) {
      // Ya existe un like, lo eliminamos
      await socialModuleService.deletePosterReactions(existingReaction[0].id)
      action = "removed"
      console.log("Like removed from poster:", input.poster_id)
    } else {
      // No existe un like, lo creamos
      reaction = await socialModuleService.createPosterReactions({
        poster_id: input.poster_id,
        customer_id: input.customer_id,
        reaction_type: "like"
      })
      action = "added"
      console.log("Like added to poster:", input.poster_id)
    }
    
    // 2. Obtener el conteo actualizado de likes para este poster
    const allLikes = await socialModuleService.listPosterReactions({
      poster_id: input.poster_id,
      reaction_type: "like"
    })
    
    const likes_count = allLikes.length
    
    // 3. Actualizar el contador de likes en el poster
    await socialModuleService.updatePosters({
      id: input.poster_id,
      likes_count: likes_count
    })
    
    const result: TogglePosterLikeOutput = {
      action,
      reaction,
      likes_count
    }
    
    console.log("Toggle like result:", result)
    
    return new StepResponse(result, async () => {
      // Compensación: revertir la acción
      console.log("Rolling back toggle like action")
      if (action === "added" && reaction) {
        await socialModuleService.deletePosterReactions(reaction.id)
      } else if (action === "removed") {
        await socialModuleService.createPosterReactions({
          poster_id: input.poster_id,
          customer_id: input.customer_id,
          reaction_type: "like"
        })
      }
      
      // Revertir el contador
      const revertedLikes = await socialModuleService.listPosterReactions({
        poster_id: input.poster_id,
        reaction_type: "like"
      })
      
      await socialModuleService.updatePosters({
        id: input.poster_id,
        likes_count: revertedLikes.length
      })
    })
  }
)
