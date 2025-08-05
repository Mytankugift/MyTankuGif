
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { listUsersWorkflow } from "../../../../workflows/friends";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    console.log("llega al punto final")
  const { result: users } = await listUsersWorkflow(req.scope).run();

  console.log("estos son los usuarios", users)

  res.status(200).json({ users });
};
