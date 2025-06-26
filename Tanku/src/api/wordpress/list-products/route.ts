
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { getProductsWorkflow } from "../../../workflows/store_product";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result: products } = await getProductsWorkflow(req.scope).run({
   
  });

  res.status(200).json({ products });
};
