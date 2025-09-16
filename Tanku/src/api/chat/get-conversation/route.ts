import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { getChatConversationWorkflow } from "../../../workflows/chat"

const schema = z.object({
  customer_id: z.string(),
  friend_customer_id: z.string(),
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0)
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const customerId = req.query.customer_id
    const friendCustomerId = req.query.friend_customer_id
    const limit = Number(req.query.limit)
    const offset = Number(req.query.offset)
    const validatedQuery = schema.parse({
      customer_id: customerId,
      friend_customer_id: friendCustomerId,
      limit: limit,
      offset: offset
    })

    console.log("validatedQuery", validatedQuery)

    const { result } = await getChatConversationWorkflow(req.scope).run({
      input: validatedQuery
    })

    res.status(200).json({
      conversation: result.conversation,
      friendship: result.friendship,
      messages: result.messages,
      total_count: result.total_count,
      has_more: result.has_more
    })

  } catch (error) {
    console.error("Error en get-conversation:", error)
    res.status(500).json({
      error: "Error al obtener conversación",
      details: error.message
    })
  }
}
