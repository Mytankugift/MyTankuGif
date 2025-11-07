import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { STALKER_GIFT_MODULE } from "../index";
import StalkerGiftModuleService from "../service";

/**
 * GET /stalker-gift/:id
 * Obtiene un stalker gift por su ID
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Stalker gift ID is required",
      });
    }

    const stalkerGiftModuleService: StalkerGiftModuleService = req.scope.resolve(
      STALKER_GIFT_MODULE
    );

    const stalkerGifts = await stalkerGiftModuleService.listStalkerGifts({
      id: id as string,
    });

    if (!stalkerGifts || stalkerGifts.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Stalker gift not found",
      });
    }

    const stalkerGift = stalkerGifts[0];

    // Generar URL de invitacion si no existe
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8000";
    const invitationUrl = `${frontendUrl}/stalkergift/${stalkerGift.id}`;

    return res.status(200).json({
      success: true,
      data: {
        ...stalkerGift,
        invitationUrl,
      },
    });
  } catch (error) {
    console.error("[STALKER GIFT API] Error getting stalker gift:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to get stalker gift",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}