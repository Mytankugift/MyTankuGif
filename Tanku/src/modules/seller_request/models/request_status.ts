import { model } from "@medusajs/framework/utils";
import SellerRequest from "./seller_request";

const RequestStatus = model.define("request_status", {
  id: model.id().primaryKey(),
  status: model.enum(["aceptado", "rechazado", "corrección", "pendiente"]),
  requests: model.hasMany(() => SellerRequest, {
    mappedBy: "status",
  }),
});

export default RequestStatus;
