import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { updatePersonalInfoWorkflow } from "../../../workflows/personal_information";
import { z } from "zod";

// Esquema de validación
const UpdateStatusMessageSchema = z.object({
  customer_id: z.string(),
  status_message: z.string().max(200, "El mensaje de estado no puede exceder 200 caracteres"),
});

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("=== Update Status Message Endpoint ===");
    console.log("Body received:", req.body);

    // Validar datos del cuerpo
    const validationResult = UpdateStatusMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        details: validationResult.error.errors
      });
    }

    const { customer_id, status_message } = validationResult.data;

    console.log("Customer ID:", customer_id);
    console.log("Status Message:", status_message);

    // Actualizar información personal usando el workflow
    const { result: updateResult } = await updatePersonalInfoWorkflow(req.scope).run({
      input: {
        customer_id,
        status_message
      }
    });

    console.log("Update result:", updateResult);

    return res.status(200).json({
      success: true,
      message: "Mensaje de estado actualizado exitosamente",
      data: {
        status_message,
        personal_info: updateResult
      }
    });

  } catch (error) {
    console.error("Error updating status message:", error);
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error.message
    });
  }
}
