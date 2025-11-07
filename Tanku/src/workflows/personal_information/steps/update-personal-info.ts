import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { PERSONAL_INFORMATION_MODULE } from "../../../modules/personal_information";
import PersonalInformationModuleService from "../../../modules/personal_information/service";

export interface UpdatePersonalInfoInput {
  customer_id: string;
  avatar_url?: string;
  status_message?: string;
  pseudonym?: string;
  banner_profile_url?: string;
  social_url?: any;
  birthday?: Date;
  marital_status?: string;
  languages?: any;
  interests?: any;
  favorite_colors?: any;
  favorite_activities?: any;
}

export const updatePersonalInfoStep = createStep(
  "update-personal-info-step",
  async (data: UpdatePersonalInfoInput, { container }) => {
   
    
    const personalInfoService: PersonalInformationModuleService = container.resolve(
      PERSONAL_INFORMATION_MODULE
    );

    try {
      // Buscar si ya existe información personal para este customer
      const existingInfo = await personalInfoService.listPersonalInformations({
        customer_id: data.customer_id
      });

      let result;

      if (existingInfo && existingInfo.length > 0) {
        // Actualizar información existente
      
        
        // Solo incluir campos que realmente se están actualizando (no undefined)
        const updateData: any = {};
        
        if (data.avatar_url !== undefined) {
          updateData.avatar_url = data.avatar_url;
        }
        if (data.status_message !== undefined) {
          updateData.status_message = data.status_message;
        }
        if (data.pseudonym !== undefined) {
          updateData.pseudonym = data.pseudonym;
        }
        if (data.banner_profile_url !== undefined) {
          updateData.banner_profile_url = data.banner_profile_url;
        }
        if (data.social_url !== undefined) {
          updateData.social_url = data.social_url;
        }
        if (data.birthday !== undefined) {
          updateData.birthday = data.birthday;
        }
        if (data.marital_status !== undefined) {
          updateData.marital_status = data.marital_status;
        }
        if (data.languages !== undefined) {
          updateData.languages = data.languages;
        }
        if (data.interests !== undefined) {
          updateData.interests = data.interests;
        }
        if (data.favorite_colors !== undefined) {
          updateData.favorite_colors = data.favorite_colors;
        }
        if (data.favorite_activities !== undefined) {
          updateData.favorite_activities = data.favorite_activities;
        }
        
      
        
        // Usar updatePersonalInformations con sintaxis correcta - incluir ID en updateData
        const updateDataWithId = {
          ...updateData,
          id: existingInfo[0].id
        };
        
        result = await personalInfoService.updatePersonalInformations(
          updateDataWithId
        );
        
       
        
        // Verificar si la actualización realmente funcionó
        const verifyUpdate = await personalInfoService.listPersonalInformations({
          id: existingInfo[0].id
        });
      
      } else {
        // Crear nueva información personal
     
        const createData = {
          customer_id: data.customer_id,
          avatar_url: data.avatar_url,
          status_message: data.status_message,
          pseudonym: data.pseudonym,
          banner_profile_url: data.banner_profile_url,
          social_url: data.social_url,
          birthday: data.birthday,
          marital_status: data.marital_status,
          languages: data.languages,
          interests: data.interests,
          favorite_colors: data.favorite_colors,
          favorite_activities: data.favorite_activities,
        };
        
        result = await personalInfoService.createPersonalInformations(createData);
      }

     
      return new StepResponse(result, result);
    } catch (error) {
      console.error("Error updating personal info:", error);
      throw error;
    }
  },
  async (result, { container }) => {
    // Función de compensación en caso de error
   
    // Aquí podrías implementar lógica de rollback si es necesario
  }
);
