import { addUserBehaviorWorkflow } from "../../../workflows/user_profiles";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

interface AddUserBehaviorInput {
  customer_id: string;
  action_type: string;
  keywords: string[];
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {

    const { customer_id, action_type, keywords } = req.body as any ;

    if (!customer_id) {
      return res.status(400).json({
        message: "customer_id es obligatorio",
      });
    }

    const getListWishList = await addUserBehaviorWorkflow(req.scope).run({
      input: { customer_id, action_type, keywords },
    });
    
    res.status(200).json({
      data: getListWishList,
    });
  } catch (error) {
    console.error("Error al obtener los datos para crear la lista de deseos:", error)
    throw error
  }
};