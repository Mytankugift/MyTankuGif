import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export interface CreateUserStoryInput {
  customer_id: string
  title?: string
  description?: string
  files: Array<{
    file_url: string
    file_type: string
    file_size: number
    order_index: number
  }>
}

export interface CreateUserStoryOutput {
  story: any // Usar any para evitar problemas de tipado con el servicio
  storyFiles: any[] // Usar any[] para evitar problemas de tipado
}

export const createUserStoryStep = createStep(
  "create-user-story-step",
  async (input: CreateUserStoryInput, { container }) => {
    console.log("=== CREATING USER STORY STEP ===")
    console.log("Input:", input)
    
    const socialModuleService: SocialModuleService = container.resolve(
      SOCIAL_MODULE
    )
    
    // Crear la story principal
    const story = await socialModuleService.createStoriesUsers({
      customer_id: input.customer_id,
      title: input.title || "Nueva Historia",
      description: input.description || null,
      duration: 24, // 24 horas por defecto
      views_count: 0,
      is_active: true,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas desde ahora
    })
    
    console.log("Story created:", story)
    
    // Crear los archivos asociados
    const storyFiles: any[] = []
    for (const file of input.files) {
      const storyFile = await socialModuleService.createStoryFiles({
        story_id: story.id,
        file_url: file.file_url,
        file_type: file.file_type,
        file_size: file.file_size,
        duration: file.file_type.startsWith('video') ? null : null, // Para videos se puede calcular después
        order_index: file.order_index,
      })
      
      storyFiles.push(storyFile)
    }
    
    console.log("Story files created:", storyFiles)
    
    const result: CreateUserStoryOutput = {
      story,
      storyFiles
    }
    
    return new StepResponse(
      result,
      async () => {
        console.log("=== COMPENSATING USER STORY CREATION ===")
        
        // Eliminar archivos de story creados
        for (const storyFile of storyFiles) {
          try {
            await socialModuleService.deleteStoryFiles(storyFile.id)
            console.log(`Deleted story file: ${storyFile.id}`)
          } catch (error) {
            console.error(`Error deleting story file ${storyFile.id}:`, error)
          }
        }
        
        // Eliminar la story principal
        try {
          await socialModuleService.deleteStoriesUsers(story.id)
          console.log(`Deleted story: ${story.id}`)
        } catch (error) {
          console.error(`Error deleting story ${story.id}:`, error)
        }
      }
    )
  }
)