import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"
import { Modules } from "@medusajs/framework/utils"

export interface GetPosterCommentsInput {
  poster_id: string
}

export interface GetPosterCommentsOutput {
  comments: any[]
  total_count: number
}

export const getPosterCommentsStep = createStep(
  "get-poster-comments-step",
  async (input: GetPosterCommentsInput, { container }) => {
    console.log("=== GETTING POSTER COMMENTS STEP ===")
    console.log("Input:", input)
    
    const socialModuleService: SocialModuleService = container.resolve(
      SOCIAL_MODULE
    )
    const customerService = container.resolve(Modules.CUSTOMER)
    
    // 1. Obtener todos los comentarios del poster
    const comments = await socialModuleService.listPosterComments({
      poster_id: input.poster_id
    })
    
    console.log("Comments found:", comments.length)
    
    // 2. Enriquecer comentarios con información del customer
    const commentsWithCustomerInfo: any[] = []
    
    for (const comment of comments) {
      // Obtener información del customer
      let customerInfo: any = null
      try {
        customerInfo = await customerService.retrieveCustomer(comment.customer_id)
      } catch (error) {
        console.error(`Error retrieving customer ${comment.customer_id}:`, error)
      }
      
      commentsWithCustomerInfo.push({
        ...comment,
        customer_name: customerInfo ? `${customerInfo.first_name || ''} ${customerInfo.last_name || ''}`.trim() || customerInfo.email : 'Usuario',
        customer_email: customerInfo?.email || '',
      })
    }
    
    // 3. Separar comentarios padre e hijos
    const parentComments = commentsWithCustomerInfo.filter(comment => !comment.parent_id)
    const childComments = commentsWithCustomerInfo.filter(comment => comment.parent_id)
    
    // 4. Crear estructura jerárquica
    const hierarchicalComments = parentComments.map(parent => {
      const replies = childComments
        .filter(child => child.parent_id === parent.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      return {
        ...parent,
        replies: replies,
        replies_count: replies.length
      }
    })
    
    // 5. Ordenar comentarios padre por fecha (más antiguos primero)
    const sortedComments = hierarchicalComments.sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    
    const result: GetPosterCommentsOutput = {
      comments: sortedComments,
      total_count: commentsWithCustomerInfo.length // Total incluyendo respuestas
    }
    
    console.log("Get comments result:", {
      total_comments: result.total_count
    })
    
    return new StepResponse(result)
  }
)
