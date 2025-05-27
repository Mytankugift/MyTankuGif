import { getListWishListWorkflow } from "../../../../workflows/wish_list";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

interface getWishListInput {
  customerId: string;
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {

    const { customerId } = req.params ;

    if (!customerId) {
      return res.status(400).json({
        message: "customerId es obligatorio",
      });
    }

    const getListWishList = await getListWishListWorkflow(req.scope).run({
      input: { customerId },
    });
    
    res.status(200).json({
      data: getListWishList,
    });
  } catch (error) {
    console.error("Error al obtener los datos para crear la lista de deseos:", error)
    throw error
  }
};