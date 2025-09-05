// src/jobs/delete-stories-job.ts

import { MedusaContainer } from "@medusajs/framework/types"
import { deleteOldStoriesWorkflow } from "../workflows/user-story"

export default async function deleteStoriesJob(container: MedusaContainer) {
 
  
  try {
    const { result } = await deleteOldStoriesWorkflow(container).run()

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