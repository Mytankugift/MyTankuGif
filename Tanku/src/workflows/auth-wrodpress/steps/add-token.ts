import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { AUTH_WORDPRESS_MODULE } from "../../../modules/auth-wordpress";
import AuthWordpressService from "../../../modules/auth-wordpress/service";

type AddTokenInput = {
    token: string;
}

const addTokenStep = createStep(
  "add-token-step",
  async (
    {token} : AddTokenInput  ,
     {container}
    ) => {
    const authWordpressService: AuthWordpressService = container.resolve(
        AUTH_WORDPRESS_MODULE
    );

    
    const addToken = await authWordpressService.createCustomerTokens({
        token: token
    });
    
    return new StepResponse(addToken,addToken.id);
  },
  async (id: string, { container }) => {
    const authWordpressService: AuthWordpressService = container.resolve(
        AUTH_WORDPRESS_MODULE
    );
    await authWordpressService.deleteCustomerTokens(id);
    
}
)

export default addTokenStep