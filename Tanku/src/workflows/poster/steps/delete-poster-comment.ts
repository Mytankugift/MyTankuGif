import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export interface DeletePosterCommentInput {
  comment_id: string
}

export interface DeletePosterCommentOutput {
  comments_count: number
}

export const deletePosterCommentStep = createStep(
  "delete-poster-comment-step",
  async (input: DeletePosterCommentInput, { container }) => {
    console.log("=== DELETING POSTER COMMENT STEP ===")
    console.log("Input:", input)
    
    const socialModuleService: SocialModuleService = container.resolve(
      SOCIAL_MODULE
    )
    
    // 1. Obtener el comentario para la compensación y obtener el poster_id
    const comment = await socialModuleService.retrievePosterComment(input.comment_id)
    const poster_id = comment.poster_id
    
    // 2. Eliminar el comentario
    await socialModuleService.deletePosterComments(input.comment_id)
    
    console.log("Comment deleted successfully:", input.comment_id)
    
    // 3. Obtener el conteo actualizado de comentarios para este poster
    const remainingComments = await socialModuleService.listPosterComments({
      poster_id: poster_id
    })
    
    const comments_count = remainingComments.length
    
    // 4. Actualizar el contador de comentarios en el poster
    await socialModuleService.updatePosters({
      id: poster_id,
      comments_count: comments_count
    })
    
    const result: DeletePosterCommentOutput = {
      comments_count
    }
    
    console.log("Delete comment result:", result)
    
    return new StepResponse(result, async () => {
      // Compensación: recrear el comentario
      console.log("Rolling back comment deletion:", input.comment_id)
      await socialModuleService.createPosterComments({
        id: comment.id,
        poster_id: comment.poster_id,
        customer_id: comment.customer_id,
        content: comment.content
      })
      
      // Revertir el contador
      const revertedComments = await socialModuleService.listPosterComments({
        poster_id: poster_id
      })
      
      await socialModuleService.updatePosters({
        id: poster_id,
        comments_count: revertedComments.length
      })
    })
  }
)
