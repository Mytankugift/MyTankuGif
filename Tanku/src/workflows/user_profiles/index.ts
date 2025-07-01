import { createWorkflow, WorkflowResponse, when } from "@medusajs/framework/workflows-sdk";
import addUserBehaviorStep from "./steps/add-user-behaivor-step";
import { Modules } from "@medusajs/framework/utils";
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows";
import { USER_PROFILE_MODULE } from "../../modules/user-profiles";
import updateUserProfileStep from "./steps/update-user-profile";
//import updateUserProfileStep from "./steps/update-user-profile";


 export type AddUserBehaviorInput = {
    customer_id: string,
    action_type: "view_product" | "add_to_cart" | "purchase" | "wishlist" | "search" | "navigation",
    keywords: string
}


export const addUserBehaviorWorkflow = createWorkflow(
  "add-user-behavior", (input: AddUserBehaviorInput) => {

    const userBehavior = addUserBehaviorStep(input)

     createRemoteLinkStep([
          {
            [Modules.CUSTOMER]: {
              customer_id: input.customer_id,
            },
            [USER_PROFILE_MODULE]: {
              user_behavior_id: userBehavior.id,
            },
          },
        ]);

    return new WorkflowResponse(userBehavior)
  }
);

export const updateUserProfile = createWorkflow("update-user-profile",()=>{
  
  const update = updateUserProfileStep()

  when(update, (links) => Array.isArray(links) && links.length > 0)
    .then(() => {
      createRemoteLinkStep(update)
    })

  

  return new WorkflowResponse(update)
})

