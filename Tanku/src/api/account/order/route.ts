import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { listCustomerOrderWorkflow } from "../../../workflows/order_customer";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { customerId } = req.query;
  
    
    if (!customerId) {
      return res.status(400).json({
        error: "Se requiere un customerId",
        success: false
      });
    }
    
    // Recupera las órdenes del cliente
   
    const result = await listCustomerOrderWorkflow(req.scope).run({
      input: {customerId: customerId as string},
    });
    
    
    
    return res.status(200).json({
      orders: result,
      success: true
    });
  } catch (error) {
    console.error("Error al obtener órdenes:", error);
    return res.status(500).json({
      error: "Error al procesar la solicitud",
      success: false
    });
  }
}