import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  CreateSellerRequestInput,
  createSellerRequestWorkflow,
  retrieveSellerRequestWorkflow,
  RetrieveSellerRequestInput,
} from "../../../workflows/seller_request";
import { z } from "zod";
import { Modules } from "@medusajs/framework/utils";
import { MedusaError } from "@medusajs/framework/utils";
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows";

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

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files?.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No files were uploaded"
      );
    }

    const { result } = await uploadFilesWorkflow(req.scope).run({
      input: {
        files: files?.map((f) => ({
          filename: f.originalname,
          mimeType: f.mimetype,
          content: f.buffer.toString("binary"),
          access: "public",
        })),
      },
    });



    const requestData = JSON.parse((req.body as any).requestData);
    if (!req.files) {
      throw new Error("No files were uploaded.");
    }
    const rutFile = result[0].url;
    const commerceFile = result[1].url;
    const idFile = result[2].url;

    if (!rutFile || !commerceFile || !idFile) {
      throw new Error("Todos los archivos son obligatorios");
    }

    const dataBody = {
      dataSellerRequest: {
        first_name: requestData.firstName,
        last_name: requestData.lastName,
        email: requestData.email,
        phone: requestData.phone,
        address: requestData.address,
        region: requestData.region,
        city: requestData.city,
        country: requestData.country,
        status_id: "id_pending",
        website: requestData.website,
        social_media: requestData.socialMedia,
        rutFile: rutFile,
        commerceFile: commerceFile,
        idFile: idFile,
      },
      customerId: requestData.customerId,
    };

    const validatedBody = createSellerRequestSchema.parse({
      dataSellerRequest: dataBody.dataSellerRequest,
      customerId: dataBody.customerId,
    });

    const { result: seller_request } = await createSellerRequestWorkflow(
      req.scope
    ).run({
      input: validatedBody as CreateSellerRequestInput,
    });

    res.status(200).json({ seller_request: seller_request });
  } catch (error) {
    console.error("este es el error en la solicitud de vendedores:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Invalid input", errors: error.errors });
    } else {
      res.status(500).json({
        message: "An error occurred while creating the seller request",
      });
    }
  }
};

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { clientId } = req.query;

  if (!clientId) {
    return res.status(400).json({
      message: "Client ID is required",
    });
  }

  try {
    const { result } = await retrieveSellerRequestWorkflow(req.scope).run({
      input: { customerId: clientId } as RetrieveSellerRequestInput,
    });

    res.json({
      dataSellerRequest: result.sellerRequest,
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while processing your request",
      error: error.message,
    });
  }
};
