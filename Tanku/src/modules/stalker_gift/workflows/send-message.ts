import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk";
import { STALKER_GIFT_MODULE } from "../index";
import StalkerGiftModuleService from "../service";

// Tipos de entrada del workflow
export interface SendMessageWorkflowInput {
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: "text" | "image" | "file" | "audio";
  file_url?: string;
  reply_to_id?: string;
}

// Step para verificar que la conversacion exista y este habilitada
export const verifyConversationStep = createStep(
  "verify-conversation-step",
  async (input: SendMessageWorkflowInput, { container }) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
      STALKER_GIFT_MODULE
    );

    const conversations = await stalkerGiftModuleService.listStalkerChatConversations({
      id: input.conversation_id,
    });

    if (!conversations || conversations.length === 0) {
      throw new Error(`Conversation with id ${input.conversation_id} not found`);
    }

    const conversation = conversations[0];

    if (!conversation.is_enabled) {
      throw new Error("Conversation is not enabled");
    }

    if (!conversation.is_active) {
      throw new Error("Conversation is not active");
    }

    // Verificar que el sender sea parte de la conversacion
    if (
      conversation.customer_giver_id !== input.sender_id &&
      conversation.customer_recipient_id !== input.sender_id
    ) {
      throw new Error("Sender is not part of this conversation");
    }

    return new StepResponse(conversation);
  }
);

// Step para crear el mensaje
export const createMessageStep = createStep(
  "create-message-step",
  async (
    { input, conversation }: { input: SendMessageWorkflowInput; conversation: any },
    { container }
  ) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
      STALKER_GIFT_MODULE
    );

    // Crear el mensaje
    const messageData = {
      conversation_id: input.conversation_id,
      sender_id: input.sender_id,
      content: input.content,
      message_type: input.message_type || "text",
      file_url: input.file_url || null,
      reply_to_id: input.reply_to_id || null,
      is_edited: false,
      is_deleted: false,
    };

    const messages = await stalkerGiftModuleService.createStalkerChatMessages([
      messageData,
    ]);

    const message = messages[0];

    return new StepResponse(message, message.id);
  },
  async (messageId: string, { container }) => {
    // Rollback: eliminar el mensaje
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
      STALKER_GIFT_MODULE
    );

    await stalkerGiftModuleService.deleteStalkerChatMessages([messageId]);
  }
);

// Step para crear el estado del mensaje
export const createMessageStatusStep = createStep(
  "create-message-status-step",
  async (
    { message, conversation }: { message: any; conversation: any },
    { container }
  ) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
      STALKER_GIFT_MODULE
    );

    // Determinar el receptor (el que no es el sender)
    const receiverId =
      message.sender_id === conversation.customer_giver_id
        ? conversation.customer_recipient_id
        : conversation.customer_giver_id;

    // Crear estado del mensaje
    const statusData = {
      message_id: message.id,
      customer_id: receiverId,
      status: "sent",
      status_at: new Date(),
    };
 //@ts-ignore
    const statuses = await stalkerGiftModuleService.createStalkerMessageStatuses([
      statusData,
    ]);

    const status = statuses[0];

    return new StepResponse(
      {
        message,
        status,
      },
      status.id
    );
  },
  async (statusId: string, { container }) => {
    // Rollback: eliminar el estado
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
      STALKER_GIFT_MODULE
    );
 //@ts-ignore
    await stalkerGiftModuleService.deleteStalkerMessageStatuses([statusId]);
  }
);

// Step para actualizar la conversacion con el ultimo mensaje
export const updateConversationLastMessageStep = createStep(
  "update-conversation-last-message-step",
  async (
    { conversation, message }: { conversation: any; message: any },
    { container }
  ) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
      STALKER_GIFT_MODULE
    );

    const previousLastMessageId = conversation.last_message_id;
    const previousLastMessageAt = conversation.last_message_at;

    // Actualizar conversacion
    const updatedConversations = await stalkerGiftModuleService.updateStalkerChatConversations([
      {
        id: conversation.id,
        last_message_id: message.id,
        last_message_at: new Date(),
      },
    ]);

    return new StepResponse(updatedConversations[0], {
      conversation_id: conversation.id,
      previous_last_message_id: previousLastMessageId,
      previous_last_message_at: previousLastMessageAt,
    });
  },
  async (compensateData, { container }) => {
    if (!compensateData) {
      return;
    }

    // Rollback: restaurar ultimo mensaje anterior
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
      STALKER_GIFT_MODULE
    );

    const rollbackData: any = {
      id: compensateData.conversation_id,
    };

    if (compensateData.previous_last_message_id) {
      rollbackData.last_message_id = compensateData.previous_last_message_id;
      rollbackData.last_message_at = compensateData.previous_last_message_at;
    }

    await stalkerGiftModuleService.updateStalkerChatConversations([rollbackData]);
  }
);

// Workflow principal
export const sendMessageWorkflow = createWorkflow(
  "send-message-workflow",
  (input: SendMessageWorkflowInput) => {
    // Paso 1: Verificar que la conversacion exista y este habilitada
    const conversation = verifyConversationStep(input);

    // Paso 2: Crear el mensaje
    const message = createMessageStep({ input, conversation });

    // Paso 3: Crear estado del mensaje
    const messageWithStatus = createMessageStatusStep({ message, conversation });

    // Paso 4: Actualizar conversacion con ultimo mensaje
    const updatedConversation = updateConversationLastMessageStep({
      conversation,
      message,
    });

    return new WorkflowResponse({
      message: messageWithStatus.message,
      status: messageWithStatus.status,
      conversation: updatedConversation,
    });
  }
);