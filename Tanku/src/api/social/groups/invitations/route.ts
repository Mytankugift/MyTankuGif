// import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
// import { getGroupInvitationsWorkflow } from "../../../../workflows/friendship-groups"
// import { z } from "zod"

// const getInvitationsSchema = z.object({
//   user_id: z.string().min(1, "El ID del usuario es requerido"),
// })

// export async function GET(req: MedusaRequest, res: MedusaResponse) {
//   try {
//     const { user_id } = getInvitationsSchema.parse(req.query)

//     // Execute the workflow
//     const { result } = await getGroupInvitationsWorkflow(req.scope).run({
//       input: { user_id },
//     })

//     res.status(200).json({
//       success: true,
//       invitations: result.invitations
//     })
//   } catch (error) {
//     console.error("Error getting group invitations:", error)
    
//     if (error instanceof z.ZodError) {
//       return res.status(400).json({
//         success: false,
//         error: "Parámetros inválidos",
//         details: error.errors
//       })
//     }

//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : "Error interno del servidor"
//     })
//   }
// }
