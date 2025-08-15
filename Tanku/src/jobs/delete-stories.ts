// src/jobs/delete-stories-job.ts

import { MedusaContainer } from "@medusajs/framework/types"
import { deleteOldStoriesWorkflow } from "../workflows/user-story"

export default async function deleteStoriesJob(container: MedusaContainer) {
  console.log("=== STARTING DELETE OLD STORIES JOB ===")
  
  try {
    const { result } = await deleteOldStoriesWorkflow(container).run()
    
    console.log("Delete stories job completed successfully:", {
      deletedStoriesCount: result.deletedStoriesCount,
      deletedStoryIds: result.deletedStoryIds
    })
    
    return result
  } catch (error) {
    console.error("Error in delete stories job:", error)
    throw error
  }
}

export const config = {
  name: "delete-stories-job",
  // Ejecuta cada día a medianoche (0 0 * * *)
  // Para testing, se puede usar "* * * * *" (cada minuto)
  schedule: "0 0 * * *",
}