// import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
// import { getOnboardingStatusWorkflow } from "../../../../workflows/onboarding/get-onboarding-status"

// export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
//   try {
//     const { customer_id } = req.query

//     if (!customer_id) {
//       return res.status(400).json({
//         success: false,
//         message: "customer_id es requerido"
//       })
//     }

//     const { result } = await getOnboardingStatusWorkflow(req.scope).run({
//       input: { customer_id: customer_id as string }
//     })

//     return res.status(200).json({
//       success: true,
//       data: result
//     })
//   } catch (error) {
//     console.error("Error al obtener estado del onboarding:", error)
//     return res.status(500).json({
//       success: false,
//       message: "Error al obtener estado del onboarding",
//       error: error.message,
//     })
//   }
// }
