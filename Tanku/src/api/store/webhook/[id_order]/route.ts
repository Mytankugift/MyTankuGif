// src/api/ruta/[id]/route.ts

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { updateOrderEpaycoWebhookWorkflow } from "../../../../workflows/epayco_webhook";

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        console.log("params",req.params)
        const { id_order } = req.params  ;
        
        const dataProduct = await updateOrderEpaycoWebhookWorkflow(req.scope).run({
          input: { id_order },
        });
      
        res.status(200).json({
          paymentEpayco: dataProduct,
        });
    } catch (error) {
        console.error("Error al obtener los datos:", error)
        res.status(500).json({
            error: error.message
        })
        throw error
    }
  // Acceder al parámetro dinámico
 
};
    
