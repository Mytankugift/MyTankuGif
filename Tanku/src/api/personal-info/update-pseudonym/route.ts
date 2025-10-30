import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { updatePersonalInfoWorkflow } from "../../../workflows/personal_information";

const UpdatePseudonymSchema = z.object({
  customer_id: z.string(),
  pseudonym: z
    .string()
    .min(2, "El seudónimo debe tener al menos 2 caracteres")
    .max(40, "El seudónimo no puede exceder 40 caracteres"),
});

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const validationResult = UpdatePseudonymSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        details: validationResult.error.errors,
      });
    }

    const { customer_id, pseudonym } = validationResult.data;

    const { result } = await updatePersonalInfoWorkflow(req.scope).run({
      input: {
        customer_id,
        pseudonym,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Seudónimo actualizado correctamente",
      data: result,
    });
  } catch (error: any) {
    console.error("Error updating pseudonym:", error);
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error?.message ?? String(error),
    });
  }
}


