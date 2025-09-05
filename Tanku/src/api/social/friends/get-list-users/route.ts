
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { listUsersWorkflow } from "../../../../workflows/friends";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
 
  const { result: users } = await listUsersWorkflow(req.scope).run();


  res.status(200).json({ users });
};
