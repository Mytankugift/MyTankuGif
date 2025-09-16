import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { sendMessageStep, SendMessageInput } from "./steps/send-message"

export const sendChatMessageWorkflow = createWorkflow(
  "send-chat-message",
  (input: SendMessageInput) => {
    // Enviar el mensaje y actualizar la conversación
    const result = sendMessageStep(input)

    return new WorkflowResponse(result)
  }
)
