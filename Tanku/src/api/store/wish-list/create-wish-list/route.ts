import { createWishListWorkflow } from "../../../../workflows/wish_list";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

interface CreateWishListInput {
  customerId: string;
  title: string;
  state_id: "PUBLIC_ID" | "PRIVATE_ID";
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {

    const { title, state_id ,customerId} = req.body as CreateWishListInput;


    if (!title || !state_id || !customerId) {
      return res.status(400).json({
        message: "title, state_id y customerId son obligatorios",
      });
    }

    const addItem = await createWishListWorkflow(req.scope).run({
      input: { title, state_id, customerId },
    });
    
    res.status(200).json({
      data: addItem,
    });
  } catch (error) {
    console.error("Error al obtener los datos para crear la lista de deseos:", error)
    throw error
  }
};