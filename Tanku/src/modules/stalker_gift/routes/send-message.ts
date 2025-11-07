import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { sendMessageWorkflow } from "../workflows";

/**
 * POST /stalker-gift/chat/send-message
 * Envia un mensaje en el chat del stalker gift
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const {
      conversation_id,
      sender_id,
      content,
      message_type = "text",
      file_url,
      reply_to_id,
    } = req.body as {
      conversation_id: string;
      sender_id: string;
      content: string;
      message_type?: "text" | "image" | "file" | "audio";
      file_url?: string;
      reply_to_id?: string;
    };

    // Validaciones
    if (!conversation_id) {
      return res.status(400).json({
        success: false,
        error: "Conversation ID is required",
      });
    }

    if (!sender_id) {
      return res.status(400).json({
        success: false,
        error: "Sender ID is required",
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Message content cannot be empty",
      });
    }

    // Validar tipo de mensaje
    const validMessageTypes = ["text", "image", "file", "audio"];
    if (!validMessageTypes.includes(message_type)) {
      return res.status(400).json({
        success: false,
        error: "Invalid message type",
        validTypes: validMessageTypes,
      });
    }

    // Ejecutar workflow
    const { result } = await sendMessageWorkflow(req.scope).run({
      input: {
        conversation_id,
        sender_id,
        content,
        message_type,
        file_url,
        reply_to_id,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        message: result.message,
        status: result.status,
        conversation: result.conversation,
      },
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("[STALKER GIFT API] Error sending message:", error);

    // Manejar errores especificos
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    let statusCode = 500;
    if (errorMessage.includes("not found")) {
      statusCode = 404;
    } else if (
      errorMessage.includes("not enabled") ||
      errorMessage.includes("not active") ||
      errorMessage.includes("not part of")
    ) {
      statusCode = 403;
    }

    return res.status(statusCode).json({
      success: false,
      error: "Failed to send message",
      message: errorMessage,
    });
  }
}