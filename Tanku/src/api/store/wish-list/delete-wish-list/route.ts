import { deleteWishListWorkflow } from "../../../../workflows/wish_list";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

interface DeleteWishListInput {

    wishListId: string;
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {

    const { wishListId } = req.body as DeleteWishListInput;


    if (!wishListId) {
      return res.status(400).json({
        message: "wishListId es obligatorio",
      });
    }

    const deleteWishList = await deleteWishListWorkflow(req.scope).run({
      input: { list_id: wishListId },
    });
    
    res.status(200).json({
      data: deleteWishList,
    });
  } catch (error) {
    console.error("Error al eliminar la lista de deseos:", error)
    throw error
  }
};