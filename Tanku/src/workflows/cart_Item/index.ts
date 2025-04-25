import {
    createWorkflow,
    WorkflowResponse,
    when,
  } from "@medusajs/framework/workflows-sdk";
import addLineItemStep from "./steps/add-line-item-step";


export type addLineItemInput = {
  variant_id: string
  cart_id: string
  quantity: number
}

export const addLineItemWorkflow = createWorkflow(
    "add-line-item",
    (input:addLineItemInput ) => {
      const addLineItem = addLineItemStep(input);
  
      return new WorkflowResponse(addLineItem);
    }
  );