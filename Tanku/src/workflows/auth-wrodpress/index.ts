import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { AUTH_WORDPRESS_MODULE } from "../../modules/auth-wordpress";
import addTokenStep from "./steps/add-token";
import checkRegistrationStep from "./steps/check-registration";

export const createTokenWorkflow = createWorkflow(
  "create-token",
  (input: {token: string}) => {
    // Paso 1: Agregar el token y extraer información (email e id_wordpress)
    const tokenResult =  addTokenStep({token: input.token});


    const validateUser = checkRegistrationStep({
      email: tokenResult.email,
      token: input.token
    });

    
    
    // Devolver el resultado del token
    return new WorkflowResponse({validateUser, tokenResult});
  }
);