import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { USER_PROFILE_MODULE } from "../../../modules/user-profiles";
import UserProfileModuleService from "../../../modules/user-profiles/service";


import { AddUserBehaviorInput } from ".."; 

const addUserBehaviorStep = createStep(
  "add-user-behavior-step",
  async (
    { customer_id, action_type, keywords }: AddUserBehaviorInput,
    { container }
  ) => {
    const userProfileService: UserProfileModuleService = container.resolve(
      USER_PROFILE_MODULE
    );

    const [existingBehaviors] = await userProfileService.listAndCountUserBehaviors({ userId: customer_id, actionType: action_type });

    if (existingBehaviors.length > 0) {
      console.log("existingBehaviors", existingBehaviors)
      const existing = existingBehaviors[0];
      existing.keywords.push(keywords);

      const updatedBehavior = await userProfileService.updateUserBehaviors(existing);

      return new StepResponse(updatedBehavior, "");
    } else {
      console.log(" en el else keywords", keywords)
      const userBehavior = await userProfileService.createUserBehaviors(
        { userId: customer_id, actionType: action_type, keywords: [keywords] }
      );
      console.log("userBehavior creado", userBehavior)
      return new StepResponse(userBehavior, userBehavior.id);
    }
    
  },
  async (sellerRequestId: string, { container }) => {
    if(sellerRequestId){
      const sellerModuleService: UserProfileModuleService = container.resolve(
        USER_PROFILE_MODULE
      );

      await sellerModuleService.deleteUserBehaviors(sellerRequestId);
    }
   
  }
);

export default addUserBehaviorStep;
