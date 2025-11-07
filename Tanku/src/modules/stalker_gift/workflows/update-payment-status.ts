import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk";
import { STALKER_GIFT_MODULE } from "../index";
import StalkerGiftModuleService from "../service";

// Tipos de entrada del workflow
export interface UpdatePaymentStatusWorkflowInput {
  stalker_gift_id: string;
  payment_status: "pending" | "success" | "failed" | "recibida";
  transaction_id?: string;
}

// Step para actualizar el estado de pago
export const updatePaymentStatusStep = createStep(
  "update-payment-status-step",
  async (input: UpdatePaymentStatusWorkflowInput, { container }) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
      STALKER_GIFT_MODULE
    );

    // Obtener el StalkerGift actual para guardar el estado anterior
    const stalkerGifts = await stalkerGiftModuleService.listStalkerGifts({
      id: input.stalker_gift_id,
    });

    if (!stalkerGifts || stalkerGifts.length === 0) {
      throw new Error(`StalkerGift with id ${input.stalker_gift_id} not found`);
    }

    const previousStatus = stalkerGifts[0].payment_status;
    const previousTransactionId = stalkerGifts[0].transaction_id;

    // Actualizar el estado de pago
    const updateData: any = {
      id: input.stalker_gift_id,
      payment_status: input.payment_status,
    };

    if (input.transaction_id) {
      updateData.transaction_id = input.transaction_id;
    }

    const updatedStalkerGifts = await stalkerGiftModuleService.updateStalkerGifts([
      updateData,
    ]);

    const updatedStalkerGift = updatedStalkerGifts[0];

    return new StepResponse(updatedStalkerGift, {
      stalker_gift_id: input.stalker_gift_id,
      previous_status: previousStatus,
      previous_transaction_id: previousTransactionId,
    });
  },
  async (compensateData, { container }) => {
    if (!compensateData) {
      return;
    }

    // Rollback: restaurar el estado anterior
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
      STALKER_GIFT_MODULE
    );

    const rollbackData: any = {
      id: compensateData.stalker_gift_id,
      payment_status: compensateData.previous_status,
    };

    if (compensateData.previous_transaction_id) {
      rollbackData.transaction_id = compensateData.previous_transaction_id;
    }

    await stalkerGiftModuleService.updateStalkerGifts([rollbackData]);
  }
);

// Workflow principal
export const updatePaymentStatusWorkflow = createWorkflow(
  "update-payment-status-workflow",
  (input: UpdatePaymentStatusWorkflowInput) => {
    const updatedStalkerGift = updatePaymentStatusStep(input);

    return new WorkflowResponse(updatedStalkerGift);
  }
);