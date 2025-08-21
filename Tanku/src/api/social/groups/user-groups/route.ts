// import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
// import { getUserGroupsWorkflow } from "../../../../workflows/friendship-groups"
// import { z } from "zod"

// const getUserGroupsSchema = z.object({
//   user_id: z.string().min(1, "El ID del usuario es requerido"),
// })

// export async function GET(req: MedusaRequest, res: MedusaResponse) {
//   try {
//     const { user_id } = getUserGroupsSchema.parse(req.query)

//     // Execute the workflow
//     const { result } = await getUserGroupsWorkflow(req.scope).run({
//       input: { user_id },
//     })

//     res.status(200).json({
//       success: true,
//       groups: result.groups
//     })
//   } catch (error) {
//     console.error("Error getting user groups:", error)
    
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
