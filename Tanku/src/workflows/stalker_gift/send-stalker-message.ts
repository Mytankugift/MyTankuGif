import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { sendStalkerMessageStep, SendStalkerMessageStepInput } from "./steps/send-stalker-message"

export const sendStalkerMessageWorkflow = createWorkflow(
  "send-stalker-message-workflow",
  (input: SendStalkerMessageStepInput) => {
    const result = sendStalkerMessageStep(input)
    
    return new WorkflowResponse(result)
  }
)
