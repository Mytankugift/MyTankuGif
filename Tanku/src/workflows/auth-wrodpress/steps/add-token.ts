import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { AUTH_WORDPRESS_MODULE } from "../../../modules/auth-wordpress";
import AuthWordpressService from "../../../modules/auth-wordpress/service";
const jwt = require('jsonwebtoken');

type AddTokenInput = {
    token: string;
}

type DecodedToken = {
    uid: number;  
    eml: string;  
    exp: number;  
}

interface CustomerToken {
    id: string;
    token: string;
    id_customer_wordpress: string;
    email: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}


function decodeWordpressToken(token: string): { id_customer_wordpress: string, email: string } | null {
    try {
        const secretKey = "T@nKu$3cr3tK3y-32CH4RS-L0nG!2024";
        
        const decoded = jwt.verify(token, secretKey) as DecodedToken;
        console.log("datos del token:", decoded);
        return {
            id_customer_wordpress: decoded.uid.toString(),
            email: decoded.eml
        };
    } catch (error) {
        console.error("Error al desencriptar el token:", error);
        return null;
    }
}

const addTokenStep = createStep<AddTokenInput, CustomerToken, string>(
  "add-token-step",
  async (
    {token} : AddTokenInput,
    {container}
  ) => {

    const authWordpressService: AuthWordpressService = container.resolve(
        AUTH_WORDPRESS_MODULE
    );

    
    const tokenData = decodeWordpressToken(token);
    const existeToken = await authWordpressService.listCustomerTokens(tokenData?.email || "");

    if (existeToken[0]) {
        return new StepResponse(existeToken[0]);
    }
    
    const addToken = await authWordpressService.createCustomerTokens({
        token: token,
        id_customer_wordpress: tokenData?.id_customer_wordpress || "",
        email: tokenData?.email || ""
    }) as CustomerToken;
    
    return new StepResponse<CustomerToken, string>(addToken, addToken.id);
  },
  async (id: string, { container }) => {
    const authWordpressService: AuthWordpressService = container.resolve(
        AUTH_WORDPRESS_MODULE
    );
    await authWordpressService.deleteCustomerTokens(id);
    
}
)

export default addTokenStep