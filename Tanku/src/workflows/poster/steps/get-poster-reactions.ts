import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export interface GetPosterReactionsInput {
  poster_id: string
  customer_id?: string
}

export interface GetPosterReactionsOutput {
  reactions: any[]
  total_count: number
  user_reaction?: any
}

export const getPosterReactionsStep = createStep(
  "get-poster-reactions-step",
  async (input: GetPosterReactionsInput, { container }) => {
    
    
    const socialModuleService: SocialModuleService = container.resolve(
      SOCIAL_MODULE
    )
    
    // 1. Obtener todas las reacciones del poster
    const allReactions = await socialModuleService.listPosterReactions({
      poster_id: input.poster_id
    })
    
    
    
    // 2. Si se proporciona customer_id, buscar la reacción específica del usuario
    let userReaction: any = undefined
    if (input.customer_id) {
      const userReactions = await socialModuleService.listPosterReactions({
        poster_id: input.poster_id,
        customer_id: input.customer_id
      })
      
      userReaction = userReactions.length > 0 ? userReactions[0] : undefined
     
    }
    
    // 3. Contar reacciones por tipo
    const reactionCounts = allReactions.reduce((acc, reaction) => {
      acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
   
    
    const result: GetPosterReactionsOutput = {
      reactions: allReactions,
      total_count: allReactions.length,
      user_reaction: userReaction
    }
  
    
    return new StepResponse(result)
  }
)
