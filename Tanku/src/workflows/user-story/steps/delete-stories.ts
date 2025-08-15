import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export interface DeleteOldStoriesOutput {
  deletedStoriesCount: number
  deletedStoryIds: string[]
}

export const deleteOldStoriesStep = createStep(
  "delete-old-stories-step",
  async (_, { container }) => {
    console.log("=== DELETING OLD STORIES STEP ===")
    
    const socialModuleService: SocialModuleService = container.resolve(
      SOCIAL_MODULE
    )
    
    // Calcular la fecha de hace 1 día
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    
    console.log("Deleting stories created before:", oneDayAgo.toISOString())
    
    // Obtener todas las historias activas
    const allStories = await socialModuleService.listStoriesUsers({
      is_active: true
    })
    
    console.log("Total active stories found:", allStories.length)
    
    // Filtrar historias que tienen más de 1 día
    const oldStories = allStories.filter(story => {
      const storyCreatedAt = new Date(story.created_at)
      return storyCreatedAt < oneDayAgo
    })
    
    console.log("Old stories to delete:", oldStories.length)
    
    const deletedStoryIds: string[] = []
    
    // Eliminar cada historia antigua
    for (const story of oldStories) {
      try {
        // Primero eliminar los archivos asociados a la historia
        const storyFiles = await socialModuleService.listStoryFiles({
          story_id: story.id
        })
        
        // Eliminar cada archivo de la historia
        for (const file of storyFiles) {
          await socialModuleService.deleteStoryFiles(file.id)
          console.log(`Deleted story file: ${file.id}`)
        }
        
        // Luego eliminar la historia
        await socialModuleService.deleteStoriesUsers(story.id)
        deletedStoryIds.push(story.id)
        console.log(`Deleted story: ${story.id} created at ${story.created_at}`)
        
      } catch (error) {
        console.error(`Error deleting story ${story.id}:`, error)
      }
    }
    
    const result: DeleteOldStoriesOutput = {
      deletedStoriesCount: deletedStoryIds.length,
      deletedStoryIds
    }
    
    console.log("Delete operation completed:", result)
    
    return new StepResponse(result)
  }
)