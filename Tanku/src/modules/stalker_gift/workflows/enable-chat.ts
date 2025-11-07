import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk";
import { STALKER_GIFT_MODULE } from "../index";
import StalkerGiftModuleService from "../service";

// Tipos de entrada del workflow
export interface EnableChatWorkflowInput {
  stalker_gift_id: string;
  customer_id: string;
}

// Step para verificar que el regalo este aceptado
export const verifyStalkerGiftStep = createStep(
  "verify-stalker-gift-step",
  async (input: EnableChatWorkflowInput, { container }) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
      STALKER_GIFT_MODULE
    );

    const stalkerGifts = await stalkerGiftModuleService.listStalkerGifts({
      id: input.stalker_gift_id,
    });

    if (!stalkerGifts || stalkerGifts.length === 0) {
      throw new Error(`StalkerGift with id ${input.stalker_gift_id} not found`);
    }

    const stalkerGift = stalkerGifts[0];

    // Verificar que el usuario sea parte del regalo
    if (
      stalkerGift.customer_giver_id !== input.customer_id &&
      stalkerGift.customer_recipient_id !== input.customer_id
    ) {
      throw new Error("Customer is not part of this StalkerGift");
    }

    // Verificar que el regalo este aceptado
    if (stalkerGift.payment_status !== "recibida") {
      throw new Error(
        `StalkerGift must be accepted before enabling chat. Current status: ${stalkerGift.payment_status}`
      );
    }

    return new StepResponse(stalkerGift);
  }
);

// Step para crear o habilitar conversacion
export const enableConversationStep = createStep(
  "enable-conversation-step",
  async (stalkerGift: any, { container }) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
      STALKER_GIFT_MODULE
    );

    // Buscar conversacion existente
    let conversations = await stalkerGiftModuleService.listStalkerChatConversations({
      stalker_gift_id: stalkerGift.id,
    });

    let conversation;
    let isNew = false;

    if (!conversations || conversations.length === 0) {
      // Crear nueva conversacion
      const newConversations = await stalkerGiftModuleService.createStalkerChatConversations([
        {
          stalker_gift_id: stalkerGift.id,
          customer_giver_id: stalkerGift.customer_giver_id || "",
          customer_recipient_id: stalkerGift.customer_recipient_id || "",
          is_enabled: true,
          enabled_at: new Date(),
          is_active: true,
        },
      ]);
      conversation = newConversations[0];
      isNew = true;
    } else {
      conversation = conversations[0];

      // Habilitar si no esta habilitada
      if (!conversation.is_enabled) {
        const updatedConversations = await stalkerGiftModuleService.updateStalkerChatConversations([
          {
            id: conversation.id,
            is_enabled: true,
            enabled_at: new Date(),
          },
        ]);
        conversation = updatedConversations[0];
      }
    }

    return new StepResponse(
      {
        conversation,
        stalkerGift,
        isNew,
      },
      {
        conversation_id: conversation.id,
        was_new: isNew,
      }
    );
  },
  async (compensateData, { container }) => {
    if (!compensateData) {
      return;
    }

    // Rollback: si se creo nueva conversacion, eliminarla
    if (compensateData.was_new) {
      const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
        STALKER_GIFT_MODULE
      );

      await stalkerGiftModuleService.deleteStalkerChatConversations([
        compensateData.conversation_id,
      ]);
    }
  }
);

// Workflow principal
export const enableChatWorkflow = createWorkflow(
  "enable-chat-workflow",
  (input: EnableChatWorkflowInput) => {
    // Paso 1: Verificar que el regalo este aceptado
    const stalkerGift = verifyStalkerGiftStep(input);

    // Paso 2: Crear o habilitar conversacion
    const result = enableConversationStep(stalkerGift);

    return new WorkflowResponse(result);
  }
);