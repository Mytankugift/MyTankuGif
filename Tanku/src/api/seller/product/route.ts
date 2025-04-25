import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { MedusaError } from "@medusajs/framework/utils";
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows";
import { getProductsByStoreWorkflow } from "../../../workflows/seller_product";
import { CreateSellerProductInput, createSellerProductWorkflow } from "../../../workflows/seller_product";

// Esquema para los datos del producto
const productDataSchema = z.object({
  storeId: z.string().min(1, "El id de la tienda es obligatorio"),
  title: z.string().min(1, "El titulo es obligatorio"),
  description: z.string().min(1, "La descripcion es obligatoria"),
  options: z.array(z.object({
    title: z.string().min(1, "El titulo es obligatorio"),
    values: z.array(z.string().min(1, "El valor es obligatorio"))
  })),
  variants: z.array(z.object({
    options: z.record(z.string(), z.string().min(1, "El valor de la opción es obligatorio")),
    prices: z.array(z.object({
      amount: z.number().min(1, "El precio es obligatorio"),
      currency_code: z.string().min(1, "El codigo de moneda es obligatorio"),
    })),
    quantity: z.number().min(0, "La cantidad debe ser mayor o igual a 0"),
    sku: z.string().min(1, "El SKU es obligatorio")
  })),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  
    const storeId = req.query.storeid as string;
    
    if (!storeId) {
      res.status(400).json({ message: "El ID de la tienda es requerido" });
      return;
    }

    const { result: products } = await getProductsByStoreWorkflow(req.scope).run({
      input: { storeId },
    });

    res.status(200).json({ products });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    
    const files = req.files as Express.Multer.File[];
    let thumbnail: string = "";
    let images: string[] = [];

    if (files?.length) {
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
      thumbnail = result[0].url;
      images = result.map((r) => r.url);
    }
    console.log("llega al puinto final Body1111111:", (req.body))
    // Procesar datos del producto
    const rawProductData = JSON.parse((req.body as any).productData);
   
    // Validar datos
    const validatedBody = productDataSchema.parse(rawProductData);

    // Crear el input para el workflow con la estructura correcta
    const workflowInput: CreateSellerProductInput = {
      productData: validatedBody,
      thumbnail,
      images
    };

    // Ejecutar el workflow
    const { result: product } = await createSellerProductWorkflow(req.scope).run({
      input: workflowInput
    });
    
    res.status(200).json({ product });
  } catch (error) {
    console.error("Error al crear el producto:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        message: "Datos del producto inválidos", 
        errors: error.errors 
      });
      return;
    }
    if (error instanceof MedusaError) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
