import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"
import { Modules } from "@medusajs/framework/utils"

export interface EditPosterCommentInput {
  comment_id: string
  content: string
}

export interface EditPosterCommentOutput {
  comment: any
}

export const editPosterCommentStep = createStep(
  "edit-poster-comment-step",
  async (input: EditPosterCommentInput, { container }) => {
    console.log("=== EDITING POSTER COMMENT STEP ===")
    console.log("Input:", input)
    
    const socialModuleService: SocialModuleService = container.resolve(
      SOCIAL_MODULE
    )
    const customerService = container.resolve(Modules.CUSTOMER)
    
    // 1. Obtener el comentario original para la compensación
    const originalComment = await socialModuleService.retrievePosterComment(input.comment_id)
    
    // 2. Actualizar el comentario
    const updatedComment = await socialModuleService.updatePosterComments({
      id: input.comment_id,
      content: input.content
    })
    
    console.log("Comment updated successfully:", input.comment_id)
    
    // 3. Obtener información del customer para enriquecer el comentario
    let customerInfo: any = null
    try {
      customerInfo = await customerService.retrieveCustomer(updatedComment.customer_id)
    } catch (error) {
      console.error(`Error retrieving customer ${updatedComment.customer_id}:`, error)
    }
    
    const enrichedComment = {
      ...updatedComment,
      customer_name: customerInfo ? `${customerInfo.first_name || ''} ${customerInfo.last_name || ''}`.trim() || customerInfo.email : 'Usuario',
      customer_email: customerInfo?.email || '',
    }
    
    const result: EditPosterCommentOutput = {
      comment: enrichedComment
    }
    
    console.log("Edit comment result:", result)
    
    return new StepResponse(result, async () => {
      // Compensación: revertir el comentario al contenido original
      console.log("Rolling back comment edit:", input.comment_id)
      await socialModuleService.updatePosterComments({
        id: input.comment_id,
        content: originalComment.content
      })
    })
  }
)
