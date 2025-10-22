import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { updatePaymentStatusWorkflow } from "../workflows";

/**
 * PATCH /stalker-gift/:id/payment
 * Actualiza el estado de pago de un stalker gift
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const { payment_status, transaction_id } = req.body as {
      payment_status: "pending" | "success" | "failed" | "recibida";
      transaction_id?: string;
    };

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Stalker gift ID is required",
      });
    }

    if (!payment_status) {
      return res.status(400).json({
        success: false,
        error: "Payment status is required",
        validStatuses: ["pending", "success", "failed", "recibida"],
      });
    }

    // Validar estado de pago
    const validStatuses = ["pending", "success", "failed", "recibida"];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment status",
        validStatuses,
      });
    }

    // Ejecutar workflow
    const { result } = await updatePaymentStatusWorkflow(req.scope).run({
      input: {
        stalker_gift_id: id as string,
        payment_status,
        transaction_id,
      },
    });

    return res.status(200).json({
      success: true,
      data: result,
      message: "Payment status updated successfully",
    });
  } catch (error) {
    console.error("[STALKER GIFT API] Error updating payment status:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to update payment status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}