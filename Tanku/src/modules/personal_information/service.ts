import { MedusaService } from "@medusajs/framework/utils";
import PersonalInformation from "./models/personal_information";

class PersonalInformationModuleService extends MedusaService({
  PersonalInformation,
}) {
  // Aquí puedes agregar métodos específicos para el servicio
}

export default PersonalInformationModuleService;
