import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { getUserStoriesWorkflow, GetUserStoriesInput } from "../../../../workflows/user-story";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
   
    
    const customer_id = req.query.customer_id as string;
    
    if (!customer_id) {
      res.status(400).json({
        success: false,
        error: "customer_id es requerido como parámetro de consulta",
      });
      return;
    }
    
    
    
    // Preparar datos para el workflow
    const workflowInput: GetUserStoriesInput = {
      customer_id,
    };
    
   
    
    // Ejecutar el workflow
    const { result } = await getUserStoriesWorkflow(req.scope).run({
      input: workflowInput,
    });
    
    
    
    // Preparar respuesta para el frontend
    const response = {
      success: true,
      userStories: result.userStories,
      friendsStories: result.friendsStories,
    };
    
  
    res.status(200).json(response);
    
  } catch (error) {
    console.error("Error al obtener las historias:", error);
    
    if (error instanceof MedusaError) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};