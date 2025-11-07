import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk";
import { STALKER_GIFT_MODULE } from "../index";
import StalkerGiftModuleService from "../service";

// Tipos de entrada del workflow
export interface CreateStalkerGiftWorkflowInput {
  giver_id?: string;
  recipient_id?: string;
  giver_alias: string;
  recipient_name: string;
  first_name: string;
  phone: string;
  email: string;
  products: any[];
  total_amount: number;
  contact_methods?: any[];
  invitation_text?: string;
  message?: string;
  payment_method?: string;
  payment_status?: string;
}

// Step para crear el StalkerGift en la base de datos
export const createStalkerGiftStep = createStep(
  "create-stalker-gift-module-step",
  async (input: CreateStalkerGiftWorkflowInput, { container }) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
      STALKER_GIFT_MODULE
    );

    // Preparar datos del StalkerGift
    const stalkerGiftData = {
      total_amount: input.total_amount,
      first_name: input.first_name,
      phone: input.phone,
      email: input.email,
      alias: input.giver_alias,
      recipient_name: input.recipient_name,
      contact_methods: (input.contact_methods || []) as unknown as Record<string, unknown>,
      products: input.products as unknown as Record<string, unknown>,
      message: input.message || null,
      customer_giver_id: input.giver_id || null,
      customer_recipient_id: input.recipient_id || null,
      payment_method: input.payment_method || "epayco",
      payment_status: input.payment_status || "pending",
    };

    // Crear el StalkerGift
    const stalkerGifts = await stalkerGiftModuleService.createStalkerGifts([
      stalkerGiftData,
    ]);
    const stalkerGift = stalkerGifts[0];

    return new StepResponse(stalkerGift, stalkerGift.id);
  },
  async (stalkerGiftId: string, { container }) => {
    // Rollback: eliminar el StalkerGift si falla el workflow
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(
      STALKER_GIFT_MODULE
    );

    await stalkerGiftModuleService.deleteStalkerGifts([stalkerGiftId]);
  }
);

// Step para generar la URL de invitacion y datos adicionales
export const generateInvitationDataStep = createStep(
  "generate-invitation-data-step",
  async (stalkerGift: any) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8000";
    const invitationUrl = `${frontendUrl}/stalkergift/${stalkerGift.id}`;

    const invitationText = `Tienes un regalo sorpresa esperandote!

Alguien que te aprecia mucho te ha enviado un regalo anonimo a traves de MyTanku.

Para ver tu regalo y conocer mas detalles, visita:
${invitationUrl}

No te lo pierdas!

---
MyTanku - Regalos que conectan corazones`;

    const enrichedData = {
      ...stalkerGift,
      invitationUrl,
      invitationText,
    };

    return new StepResponse(enrichedData);
  }
);

// Workflow principal
export const createStalkerGiftWorkflow = createWorkflow(
  "create-stalker-gift-module-workflow",
  (input: CreateStalkerGiftWorkflowInput) => {
    // Paso 1: Crear el StalkerGift
    const stalkerGift = createStalkerGiftStep(input);

    // Paso 2: Generar URL de invitacion y datos adicionales
    const enrichedStalkerGift = generateInvitationDataStep(stalkerGift);

    // Retornar resultado completo
    return new WorkflowResponse(enrichedStalkerGift);
  }
);