import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { sendChatMessageWorkflow } from "../../../workflows/chat"

const schema = z.object({
  conversation_id: z.string(),
  sender_id: z.string(),
  content: z.string().min(1),
  message_type: z.string().optional().default("text"),
  file_url: z.string().optional(),
  reply_to_id: z.string().optional()
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const validatedBody = schema.parse(req.body)

    const { result } = await sendChatMessageWorkflow(req.scope).run({
      input: validatedBody
    })

    res.status(201).json({
      message: result.message,
      success: result.success
    })

  } catch (error) {
    console.error("Error en send-message:", error)
    res.status(500).json({
      error: "Error al enviar mensaje",
      details: error.message
    })
  }
}
