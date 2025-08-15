import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"
import { Modules } from "@medusajs/framework/utils"

export interface AddPosterCommentInput {
  poster_id: string
  customer_id: string
  content: string
}

export interface AddPosterCommentOutput {
  comment: any
  comments_count: number
}

export const addPosterCommentStep = createStep(
  "add-poster-comment-step",
  async (input: AddPosterCommentInput, { container }) => {
    console.log("=== ADDING POSTER COMMENT STEP ===")
    console.log("Input:", input)
    
    const socialModuleService: SocialModuleService = container.resolve(
      SOCIAL_MODULE
    )
    const customerService = container.resolve(Modules.CUSTOMER)
    
    // 1. Crear el comentario
    const comment = await socialModuleService.createPosterComments({
      poster_id: input.poster_id,
      customer_id: input.customer_id,
      content: input.content
    })
    
    console.log("Comment created successfully:", comment.id)
    
    // 2. Obtener información del customer para enriquecer el comentario
    let customerInfo: any = null
    try {
      customerInfo = await customerService.retrieveCustomer(input.customer_id)
    } catch (error) {
      console.error(`Error retrieving customer ${input.customer_id}:`, error)
    }
    
    const enrichedComment = {
      ...comment,
      customer_name: customerInfo ? `${customerInfo.first_name || ''} ${customerInfo.last_name || ''}`.trim() || customerInfo.email : 'Usuario',
      customer_email: customerInfo?.email || '',
    }
    
    // 3. Obtener el conteo actualizado de comentarios para este poster
    const allComments = await socialModuleService.listPosterComments({
      poster_id: input.poster_id
    })
    
    const comments_count = allComments.length
    
    // 4. Actualizar el contador de comentarios en el poster
    await socialModuleService.updatePosters({
      id: input.poster_id,
      comments_count: comments_count
    })
    
    const result: AddPosterCommentOutput = {
      comment: enrichedComment,
      comments_count
    }
    
    console.log("Add comment result:", result)
    
    return new StepResponse(result, async () => {
      // Compensación: eliminar el comentario si algo falla
      console.log("Rolling back comment creation:", comment.id)
      await socialModuleService.deletePosterComments(comment.id)
      
      // Revertir el contador
      const revertedComments = await socialModuleService.listPosterComments({
        poster_id: input.poster_id
      })
      
      await socialModuleService.updatePosters({
        id: input.poster_id,
        comments_count: revertedComments.length
      })
    })
  }
)
