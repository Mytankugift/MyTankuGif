import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { updatePersonalInfoStep, UpdatePersonalInfoInput } from "./steps/update-personal-info";
import { getPersonalInfoStep, GetPersonalInfoInput } from "./steps/get-personal-info";

export interface UpdatePersonalInfoWorkflowInput extends UpdatePersonalInfoInput {}
export interface GetPersonalInfoWorkflowInput extends GetPersonalInfoInput {}

export const updatePersonalInfoWorkflow = createWorkflow(
  "update-personal-info-workflow",
   (input: UpdatePersonalInfoWorkflowInput) => {
    const result =  updatePersonalInfoStep(input);
    
    return new WorkflowResponse(result);
  }
);


export const getPersonalInfoWorkflow = createWorkflow(
  "get-personal-info-workflow",
  (input: GetPersonalInfoWorkflowInput) => {
    const result = getPersonalInfoStep(input);
    
    return new WorkflowResponse(result);
  }
);

export { UpdatePersonalInfoInput, GetPersonalInfoInput };
