// import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
// import { createFriendshipGroupWorkflow } from "../../../../workflows/friendship-groups"
// import { z } from "zod"

// const createGroupSchema = z.object({
//   group_name: z.string().min(1, "El nombre del grupo es requerido"),
//   description: z.string().optional(),
//   is_private: z.boolean().default(false),
//   created_by: z.string().min(1, "El creador es requerido"),
// })

// export async function POST(req: MedusaRequest, res: MedusaResponse) {
//   try {
//     // Parse form data for potential image upload
//     const formData = await req.formData?.() || new FormData()
    
//     const groupData = {
//       group_name: formData.get('group_name') as string,
//       description: formData.get('description') as string || undefined,
//       is_private: formData.get('is_private') === 'true',
//       created_by: formData.get('created_by') as string,
//     }

//     // Validate the data
//     const validatedData = createGroupSchema.parse(groupData)

//     // Handle image upload if present
//     const imageFile = formData.get('image') as File | null
//     let imageUrl: string | undefined

//     if (imageFile && imageFile.size > 0) {
//       // TODO: Implement image upload logic
//       // For now, we'll skip image upload
//       imageUrl = undefined
//     }

//     // Execute the workflow
//     const { result } = await createFriendshipGroupWorkflow(req.scope).run({
//       input: {
//         ...validatedData,
//         image_url: imageUrl,
//       },
//     })

//     res.status(201).json({
//       success: true,
//       group: result.group,
//       message: "Grupo creado exitosamente"
//     })
//   } catch (error) {
//     console.error("Error creating friendship group:", error)
    
//     if (error instanceof z.ZodError) {
//       return res.status(400).json({
//         success: false,
//         error: "Datos inválidos",
//         details: error.errors
//       })
//     }

//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : "Error interno del servidor"
//     })
//   }
// }
