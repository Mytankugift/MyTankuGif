import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { PERSONAL_INFORMATION_MODULE } from "../../../modules/personal_information";
import PersonalInformationModuleService from "../../../modules/personal_information/service";
import { SOCIAL_MODULE } from "../../../modules/social";
import SocialModuleService from "../../../modules/social/service";

export interface GetPersonalInfoInput {
  customer_id: string;
}

export interface PersonalInfoWithFriendsCount {
  id?: string;
  customer_id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  friends_count?: number;
  [key: string]: any;
}

export const getPersonalInfoStep = createStep(
  "get-personal-info-step",
  async (data: GetPersonalInfoInput, { container }) => {
    console.log("Getting personal info for customer:", data.customer_id);
    
    const personalInfoService: PersonalInformationModuleService = container.resolve(
      PERSONAL_INFORMATION_MODULE
    );

    const socialModuleService: SocialModuleService = container.resolve(
      SOCIAL_MODULE
    );

    try {
      // Buscar información personal para este customer
      const personalInfo = await personalInfoService.listPersonalInformations({
        customer_id: data.customer_id
      });

      // Obtener la cantidad de amigos aceptados
      const friends = await socialModuleService.listFriends({
        customer_id: data.customer_id
      })
      

      const friendsCount = friends ? friends.length : 0;
      console.log(`Found ${friendsCount} friends for customer ${data.customer_id}`);

      console.log("Personal info found:", personalInfo);

      if (personalInfo && personalInfo.length > 0) {
        // Agregar el conteo de amigos a la información personal
        const personalInfoWithFriends: PersonalInfoWithFriendsCount = {
          ...personalInfo[0],
          friends_count: friendsCount
        };

        return new StepResponse(personalInfoWithFriends, personalInfoWithFriends);
      } else {
        // Si no existe información personal, retornar solo el conteo de amigos
        console.log("No personal info found for customer:", data.customer_id);
        return new StepResponse({ customer_id: data.customer_id, friends_count: friendsCount }, null);
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
