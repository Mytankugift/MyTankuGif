import { getListWishListWordpressWorkflow } from "../../../../workflows/wish_list";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

interface getWishListInput {
  customerId: string;
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {

    const { email } = req.params ;

    if (!email) {
      return res.status(400).json({
        message: "email es obligatorio",
      });
    }

    const getListWishList = await getListWishListWordpressWorkflow(req.scope).run({
      input: { email },
    });
    
    res.status(200).json({
      data: getListWishList,
    });
  } catch (error) {
    console.error("Error al obtener los datos para crear la lista de deseos:", error)
    throw error
  }
};