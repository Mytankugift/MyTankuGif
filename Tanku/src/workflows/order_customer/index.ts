import {
  createWorkflow,
  WorkflowResponse,
  when,
  transform,
} from "@medusajs/framework/workflows-sdk";
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";
import getListOrderStep from "./steps/get-list-order";


export const listCustomerOrderWorkflow = createWorkflow(
  "list-customer-order-workflow",
  (input: {customerId: string}) => {
  
    const orderResult = getListOrderStep({customer_id: input.customerId});

    return new WorkflowResponse(orderResult);
  }
);

