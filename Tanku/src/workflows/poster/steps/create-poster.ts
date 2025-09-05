import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export interface CreatePosterInput {
  customer_id: string
  title?: string
  description?: string
  image_url: string
  video_url?: string
}

export const createPosterStep = createStep(
  "create-poster-step",
  async (input: CreatePosterInput, { container }) => {
    const socialModuleService: SocialModuleService = container.resolve(
      SOCIAL_MODULE
    )

  

    // Crear el poster
    const poster = await socialModuleService.createPosters({
      customer_id: input.customer_id,
      title: input.title || null,
      description: input.description || null,
      image_url: input.image_url,
      video_url: input.video_url || null,
      likes_count: 0,
      comments_count: 0,
      is_active: true,
    })



    return new StepResponse(poster, async () => {
      // Compensación: eliminar el poster si algo falla
     
      await socialModuleService.deletePosters(poster.id)
    })
  }
)
