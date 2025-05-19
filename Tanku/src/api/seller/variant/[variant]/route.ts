// src/api/seller/variant/[variant]/route.ts

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  
  const { variant } = req.params;
  
  try {
   
  } catch (error) {
    console.error("Error al eliminar la variante:", error);
    res.status(400).json({
      error: error.message,
    });
  }
};
    
