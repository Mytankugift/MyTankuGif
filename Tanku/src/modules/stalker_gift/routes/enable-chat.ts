import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { enableChatWorkflow } from "../workflows";

/**
 * POST /stalker-gift/:id/enable-chat
 * Habilita el chat para un stalker gift (solo si esta aceptado)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const { customer_id } = req.body as {
      customer_id: string;
    };

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Stalker gift ID is required",
      });
    }

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        error: "Customer ID is required",
      });
    }

    // Ejecutar workflow
    const { result } = await enableChatWorkflow(req.scope).run({
      input: {
        stalker_gift_id: id as string,
        customer_id,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        conversation: result.conversation,
        stalkerGift: result.stalkerGift,
        isNew: result.isNew,
      },
      message: result.isNew
        ? "Chat conversation created and enabled"
        : "Chat conversation enabled",
    });
  } catch (error) {
    console.error("[STALKER GIFT API] Error enabling chat:", error);

    // Manejar errores especificos
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    let statusCode = 500;
    if (errorMessage.includes("not found")) {
      statusCode = 404;
    } else if (
      errorMessage.includes("not part of") ||
      errorMessage.includes("must be accepted")
    ) {
      statusCode = 403;
    }

    return res.status(statusCode).json({
      success: false,
      error: "Failed to enable chat",
      message: errorMessage,
    });
  }
}