import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { STALKER_GIFT_MODULE } from "../index";
import StalkerGiftModuleService from "../service";

/**
 * GET /stalker-gift/chat/messages/:conversation_id
 * Obtiene los mensajes de una conversacion
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { conversation_id } = req.params;
    const { customer_id, limit = "50", offset = "0" } = req.query as {
      customer_id?: string;
      limit?: string;
      offset?: string;
    };

    if (!conversation_id) {
      return res.status(400).json({
        success: false,
        error: "Conversation ID is required",
      });
    }

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        error: "Customer ID is required",
      });
    }

    const stalkerGiftModuleService: StalkerGiftModuleService = req.scope.resolve(
      STALKER_GIFT_MODULE
    );

    // Verificar que la conversacion exista
    const conversations = await stalkerGiftModuleService.listStalkerChatConversations({
      id: conversation_id as string,
    });

    if (!conversations || conversations.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    const conversation = conversations[0];

    // Verificar que el customer sea parte de la conversacion
    if (
      conversation.customer_giver_id !== customer_id &&
      conversation.customer_recipient_id !== customer_id
    ) {
      return res.status(403).json({
        success: false,
        error: "Access denied to this conversation",
      });
    }

    // Obtener mensajes
    const messages = await stalkerGiftModuleService.listStalkerChatMessages(
      {
        conversation_id: conversation_id as string,
        is_deleted: false,
      },
      {
        take: parseInt(limit),
        skip: parseInt(offset),
        order: {
          created_at: "ASC",
        },
      }
    );

    // Obtener estados de los mensajes para el usuario actual
    const messageIds = messages.map((m: any) => m.id);
    let messageStatuses: any[] = [];

    if (messageIds.length > 0) {
      messageStatuses = await stalkerGiftModuleService.listStalkerMessageStatus({
        message_id: messageIds,
        customer_id: customer_id as string,
      });
    }

    // Combinar mensajes con sus estados
    const messagesWithStatus = messages.map((message: any) => {
      const status = messageStatuses.find((s: any) => s.message_id === message.id);
      return {
        ...message,
        read_status: status?.status || null,
        read_at: status?.status_at || null,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        messages: messagesWithStatus,
        conversation: {
          id: conversation.id,
          is_enabled: conversation.is_enabled,
          last_message_at: conversation.last_message_at,
        },
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: messages.length,
        },
      },
    });
  } catch (error) {
    console.error("[STALKER GIFT API] Error getting messages:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to get messages",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}