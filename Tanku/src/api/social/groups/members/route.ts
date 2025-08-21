// import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
// import { getGroupMembersWorkflow } from "../../../../workflows/friendship-groups"
// import { z } from "zod"

// const getGroupMembersSchema = z.object({
//   group_id: z.string().min(1, "El ID del grupo es requerido"),
// })

// export async function GET(req: MedusaRequest, res: MedusaResponse) {
//   try {
//     const { group_id } = getGroupMembersSchema.parse(req.query)

//     // Execute the workflow
//     const { result } = await getGroupMembersWorkflow(req.scope).run({
//       input: { group_id },
//     })

//     res.status(200).json({
//       success: true,
//       members: result.members
//     })
//   } catch (error) {
//     console.error("Error getting group members:", error)
    
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
