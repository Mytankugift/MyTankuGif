import { MedusaService } from "@medusajs/framework/utils";
import CustomerToken from "./models/token-customer";
class AuthWordpressService extends MedusaService({
  CustomerToken,
}) {
 
}   

export default AuthWordpressService;
