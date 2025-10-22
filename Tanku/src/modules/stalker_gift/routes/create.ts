import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { createStalkerGiftWorkflow } from "../workflows";

/**
 * POST /stalker-gift
 * Crea un nuevo regalo sorpresa (stalker gift)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const {
      total_amount,
      first_name,
      phone,
      email,
      giver_alias,
      recipient_name,
      contact_methods,
      products,
      message,
      giver_id,
      recipient_id,
      payment_method = "epayco",
      payment_status = "pending",
    } = req.body as {
      total_amount: number;
      first_name: string;
      phone: string;
      email: string;
      giver_alias: string;
      recipient_name: string;
      contact_methods?: any[];
      products: any[];
      message?: string;
      giver_id?: string;
      recipient_id?: string;
      payment_method?: string;
      payment_status?: string;
    };

    // Validaciones basicas
    if (!total_amount || !first_name || !email || !giver_alias || !recipient_name) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        required: ["total_amount", "first_name", "email", "giver_alias", "recipient_name"],
      });
    }

    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one product is required",
      });
    }

    // Ejecutar workflow
    const { result } = await createStalkerGiftWorkflow(req.scope).run({
      input: {
        total_amount,
        first_name,
        phone,
        email,
        giver_alias,
        recipient_name,
        contact_methods,
        products,
        message,
        giver_id,
        recipient_id,
        payment_method,
        payment_status,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        stalkerGift: result,
        invitationUrl: result.invitationUrl,
        invitationText: result.invitationText,
      },
      message: "StalkerGift created successfully",
    });
  } catch (error) {
    console.error("[STALKER GIFT API] Error creating stalker gift:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create stalker gift",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}