import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import updateOrderStatusStep from "./steps/update-order";

interface UpdateOrderEpaycoWebhookInput {
  id_order: string
}

export const updateOrderEpaycoWebhookWorkflow = createWorkflow(
  "update-order-epayco-webhook", (input: UpdateOrderEpaycoWebhookInput) => {
   
   const update = updateOrderStatusStep({orderId: input.id_order});
    return new WorkflowResponse(update);
  }
);

