import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getPersonalInfoWorkflow } from "../../../workflows/personal_information";
import { z } from "zod";

// Esquema de validación
const GetPersonalInfoSchema = z.object({
  customer_id: z.string(),
});

export async function GET(req: MedusaRequest, res: MedusaResponse) {

  try {
   

    const validationResult = GetPersonalInfoSchema.safeParse(req.query);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "customer_id es requerido",
        details: validationResult.error.errors
      });
    }

    const { customer_id } = validationResult.data;
   

    const { result } = await getPersonalInfoWorkflow(req.scope).run({
      input: {
        customer_id
      }
    });

   

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("Error getting personal info:", error);
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error.message
    });
  }
}
