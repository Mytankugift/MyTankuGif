import { Module } from "@medusajs/framework/utils";
import PersonalInformationModuleService from "./service";
import PersonalInformation from "./models/personal_information";

export const PERSONAL_INFORMATION_MODULE = "personalInformationModule";

const PersonalInformationModule = Module(PERSONAL_INFORMATION_MODULE, {
  service: PersonalInformationModuleService,
});



export default PersonalInformationModule;
