import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { addLineItemWorkflow } from "../../../../workflows/cart_Item";

interface CartItemRequest {
  variant_id: string
  quantity: number
  cart_id: string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {

    const { variant_id, quantity, cart_id } = req.body as CartItemRequest;


    if (!variant_id || !quantity || !cart_id) {
      return res.status(400).json({
        message: "Variant ID, cantidad y cart_id son obligatorios",
      });
    }

    const addItem = await addLineItemWorkflow(req.scope).run({
      input: { variant_id, quantity, cart_id },
    });
    
    res.status(200).json({
      data: addItem,
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error)
    throw error
  }
};
  