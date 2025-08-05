import { defineLink } from "@medusajs/framework/utils";
import CustomerModule from "@medusajs/medusa/customer";
import PersonalInformationModule from "../modules/personal_information";

export default defineLink(
  CustomerModule.linkable.customer,
  PersonalInformationModule.linkable.personalInformation
);
