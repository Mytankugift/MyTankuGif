import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { createSellerProductsWorkflow } from "../../../workflows/seller_product";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    
    
    const data  = req.body as any;
    
    const { result } = await createSellerProductsWorkflow(req.scope).run({
      input: { storeId: data.storeId, data: data.data },
    });

    res.status(200).json({
      data: result,
    });
    

    
  }