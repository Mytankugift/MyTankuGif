import { Module } from "@medusajs/framework/utils"
import StalkerGiftService from "./service"

// Module identifier
export const STALKER_GIFT_MODULE = "stalkerGiftModuleService"

// Module configuration
export default Module(STALKER_GIFT_MODULE, {
  service: StalkerGiftService,
})

// Export workflows
export * from "./workflows"

// Export routes
export * from "./routes"

// Export service
export { default as StalkerGiftModuleService } from "./service"

// Export models for type reference
export { default as StalkerGift } from "./models/stalker-gift"
export { default as StalkerChatConversation } from "./models/stalker-chat-conversation"
export { default as StalkerChatMessage } from "./models/stalker-chat-message"
export { default as StalkerMessageStatus } from "./models/stalker-message-status"
