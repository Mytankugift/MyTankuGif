import { addProductToWishListWordpressWorkflow } from "../../../../workflows/wish_list";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

interface CreateWishListInput {
    productId: string;
    wishListId: string;
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    console.log("entro a la peticion de agregar un producto a la lista de deseos",req.body)
    const { productId, wishListId } = req.body as CreateWishListInput;

    if (!productId || !wishListId) {
      return res.status(400).json({
        message: "productId y wishListId son obligatorios",
      });
    }

    const addItem = await addProductToWishListWordpressWorkflow(req.scope).run({
      input: { productId, wishListId },
    });
    
    res.status(200).json({
      data: addItem,
    });
  } catch (error) {
    console.error("Error al agregar un producto a la lista de deseos:", error)
    throw error
  }
};