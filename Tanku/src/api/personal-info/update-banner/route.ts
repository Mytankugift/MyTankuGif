import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows";
import { updatePersonalInfoWorkflow } from "../../../workflows/personal_information";
import { z } from "zod";

// Esquema de validación
const UpdateBannerSchema = z.object({
  customer_id: z.string(),
});

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("=== Update Banner Endpoint ===");
    console.log("Files received:", req.files);
    console.log("Body received:", req.body);

    // Validar que se recibió un archivo
    const bannerFile = req.file;
    if (!bannerFile) {
      return res.status(400).json({
        success: false,
        error: "Se requiere una imagen de banner"
      });
    }

    // Validar datos del cuerpo
    const validationResult = UpdateBannerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        details: validationResult.error.errors
      });
    }

    const { customer_id } = validationResult.data;

    console.log("Banner file:", bannerFile.originalname);
    console.log("Customer ID:", customer_id);

    // Subir archivo usando el workflow de Medusa
    const { result: uploadResult } = await uploadFilesWorkflow(req.scope).run({
      input: {
        files: [{
          filename: bannerFile.originalname,
          mimeType: bannerFile.mimetype,
          content: bannerFile.buffer.toString("binary"),
          access: "public"
        }]
      }
    });

    console.log("Upload result:", uploadResult);

    if (!uploadResult || !uploadResult.length) {
      return res.status(500).json({
        success: false,
        error: "Error al subir la imagen"
      });
    }

    const bannerUrl = uploadResult[0].url;
    console.log("Banner URL:", bannerUrl);

    // Actualizar información personal usando el workflow
    const { result: updateResult } = await updatePersonalInfoWorkflow(req.scope).run({
      input: {
        customer_id,
        banner_profile_url: bannerUrl
      }
    });

    console.log("Update result:", updateResult);

    return res.status(200).json({
      success: true,
      message: "Banner actualizado exitosamente",
      data: {
        banner_url: bannerUrl,
        personal_info: updateResult
      }
    });

  } catch (error) {
    console.error("Error updating banner:", error);
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error.message
    });
  }
}
