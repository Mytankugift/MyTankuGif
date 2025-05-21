import {
  createWorkflow,
  createStep,
  WorkflowResponse,
  StepResponse,
  when,
  transform,
} from "@medusajs/framework/workflows-sdk";
import { AUTH_WORDPRESS_MODULE } from "../../modules/auth-wordpress";
import addTokenStep from "./steps/add-token";

export const createTokenWorkflow = createWorkflow(
  "create-token",
  (input: {token: string}) => {
    const token = addTokenStep({token: input.token});
   

    return new WorkflowResponse(token);
  }
);