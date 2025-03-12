import { MedusaService } from "@medusajs/framework/utils";
import SellerRequest from "./models/seller_request";
import RequestStatus from "./models/request_status";

class SellerRequestModuleService extends MedusaService({
  SellerRequest,
  RequestStatus,
}) {}

export default SellerRequestModuleService;
