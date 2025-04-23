// src/api/ruta/[id]/route.ts

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getProductByHandleWorkflow } from "../../../../../workflows/store_product";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  // Acceder al parámetro dinámico
  const { handle } = req.params  ;
  
  const dataProduct = await getProductByHandleWorkflow(req.scope).run({
    input: { handle },
  });

  res.status(200).json({
    product: dataProduct,
  });
};
    
