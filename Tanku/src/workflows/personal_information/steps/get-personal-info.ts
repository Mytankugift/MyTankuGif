import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { PERSONAL_INFORMATION_MODULE } from "../../../modules/personal_information";
import PersonalInformationModuleService from "../../../modules/personal_information/service";

export interface GetPersonalInfoInput {
  customer_id: string;
}

export const getPersonalInfoStep = createStep(
  "get-personal-info-step",
  async (data: GetPersonalInfoInput, { container }) => {
    console.log("Getting personal info for customer:", data.customer_id);
    
    const personalInfoService: PersonalInformationModuleService = container.resolve(
      PERSONAL_INFORMATION_MODULE
    );

    try {
      // Buscar información personal para este customer
      const personalInfo = await personalInfoService.listPersonalInformations({
        customer_id: data.customer_id
      });

      console.log("Personal info found:", personalInfo);

      if (personalInfo && personalInfo.length > 0) {
        return new StepResponse(personalInfo[0], personalInfo[0]);
      } else {
        // Si no existe información personal, retornar null
        console.log("No personal info found for customer:", data.customer_id);
        return new StepResponse(null, null);
      }
    } catch (error) {
      console.error("Error getting personal info:", error);
      throw error;
    }
  },
  async (result, { container }) => {
    // No necesitamos compensación para operaciones de lectura
    console.log("No compensation needed for get operation");
  }
);
