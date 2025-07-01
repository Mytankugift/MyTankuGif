// src/jobs/update-user-profile-job.ts

import { MedusaContainer } from "@medusajs/framework/types"
import { updateUserProfile } from "../workflows/user_profiles"

export default async function updateUserProfileJob(container: MedusaContainer) {
  await updateUserProfile(container).run()
}

export const config = {
  name: "update-user-profile-job",
  // Por ejemplo, ejecuta cada día a medianoche
  schedule: "* * * * *",
}