import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { USER_PROFILE_MODULE } from "../../../modules/user-profiles";
import UserProfileModuleService from "../../../modules/user-profiles/service";


import { AddUserBehaviorInput } from ".."; 

const userProfileStep = createStep(
  "user-profile-step",
  async (
    { }: AddUserBehaviorInput,
    { container }
  ) => {
    const userProfileService: UserProfileModuleService = container.resolve(
      USER_PROFILE_MODULE
    )

    
  },
  async (sellerRequestId: string, { container }) => {
  
  }
);

export default userProfileStep;
