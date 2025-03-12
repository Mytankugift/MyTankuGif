import { model } from "@medusajs/framework/utils";
import RequestStatus from "./request_status";

const SellerRequest = model.define("seller_request", {
  id: model.id().primaryKey(),
  first_name: model.text(),
  last_name: model.text(),
  email: model.text(),
  phone: model.text(),
  address: model.text(),
  city: model.text(),
  region: model.text(),
  country: model.text(),
  website: model.text(),
  social_media: model.text(),
  comment: model.text().nullable(),
  rutFile: model.text(),
  commerceFile: model.text(),
  idFile: model.text(),
  status: model.belongsTo(() => RequestStatus, {
    mappedBy: "requests",
  }),
});

export default SellerRequest;
