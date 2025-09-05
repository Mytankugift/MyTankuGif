import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  retrieveListSellerRequestWorkflowAdmin,
  updateStatusSellerRequestWorkflowAdmin,
} from "../../../../workflows/seller_request";
import { z } from "zod";
import { Modules } from "@medusajs/framework/utils";

// Esquema para los archivos

const sellerRequestDataSchema = z.object({
  first_name: z.string().min(1, "El primer nombre es obligatorio"),
  last_name: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("El correo electrónico no es válido"),
  phone: z.string().min(1, "El teléfono es obligatorio"),
  address: z.string().min(1, "La dirección es obligatoria"),
  status_id: z.string().min(1, "stattus id es obligatorio"),
  city: z.string().min(1, "La ciudad es obligatoria"),
  region: z.string().min(1, "La region es obligatoria"),
  country: z.string().min(1, "El país es obligatorio"),
  website: z.string().url("La URL del sitio web no es válida").optional(),
  social_media: z.string().optional(),
  rutFile: z.string().min(1, "El archivo rut es obligatoria"),
  commerceFile: z.string().min(1, "El archivo commerce es obligatoria"),
  idFile: z.string().min(1, "La cedula es obligatoria"),
});

const createSellerRequestSchema = z.object({
  dataSellerRequest: sellerRequestDataSchema,
  customerId: z.string().min(1, "El ID del cliente es obligatorio"),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { result } = await retrieveListSellerRequestWorkflowAdmin(
      req.scope
    ).run();
   
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while processing your request",
      error: error.message,
    });
  }
};

//--------------------------------------------- updateStatus ------------
const updateSellerRequestSchema = z.object({
  id: z.string().min(1, "El ID de la solicitud es obligatorio"),
  status_id: z.string().min(1, "El estado de la solicitud es obligatorio"),
  comment: z.string().optional(),
});

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const validateData = updateSellerRequestSchema.parse(req.body);
    if (!validateData) {
      return res.status(400).json({
        message: "Client ID is required",
      });
    }
    const { result } = await updateStatusSellerRequestWorkflowAdmin(
      req.scope
    ).run({
      input: validateData,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while processing your request",
      error: error.message,
    });
  }
};
