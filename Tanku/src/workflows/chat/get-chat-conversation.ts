import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { getOrCreateConversationStep, GetOrCreateConversationInput } from "./steps/get-or-create-conversation"
import { getConversationMessagesStep } from "./steps/get-conversation-messages"

export interface GetChatConversationInput {
  customer_id: string
  friend_customer_id: string
  limit?: number
  offset?: number
}

export const getChatConversationWorkflow = createWorkflow(
  "get-chat-conversation",
  (input: GetChatConversationInput) => {
    // 1. Obtener o crear la conversación entre los dos usuarios
    const conversationResult = getOrCreateConversationStep({
      customer_id: input.customer_id,
      friend_customer_id: input.friend_customer_id
    })

    // 2. Obtener los mensajes de la conversación
    const messagesResult = getConversationMessagesStep({
      conversation_id: conversationResult.conversation.id,
      limit: input.limit,
      offset: input.offset
    })

    return new WorkflowResponse({
      conversation: conversationResult.conversation,
      friendship: conversationResult.friendship,
      messages: messagesResult.messages,
      total_count: messagesResult.total_count,
      has_more: messagesResult.has_more
    })
  }
)
