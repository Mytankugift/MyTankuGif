import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { addWishListWordpressWorkflow } from "../../../../workflows/wish_list";

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const { email } = req.body as { email: string } ;
        const { title } = req.body as { title: string } ;
        const { publico } = req.body as { publico: boolean } ;
        
        const dataProduct = await addWishListWordpressWorkflow(req.scope).run({
          input: { email, title, publico },
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
    