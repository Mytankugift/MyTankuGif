import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PERSONAL_INFORMATION_MODULE } from "../../../modules/personal_information"
import PersonalInformationModuleService from "../../../modules/personal_information/service"

export interface UpdateSocialNetworksInput {
  customer_id: string
  social_networks: {
    facebook?: string
    instagram?: string
    youtube?: string
    tiktok?: string
    public_alias?: string
  }
}

export const updateSocialNetworksStep = createStep(
  "update-social-networks-step",
  async (input: UpdateSocialNetworksInput, { container }) => {
   

    const personalInfoService: PersonalInformationModuleService = container.resolve(
      PERSONAL_INFORMATION_MODULE
    )

    // Buscar la información personal existente del usuario
    const existingPersonalInfo = await personalInfoService.listPersonalInformations({
      customer_id: input.customer_id
    })

    let personalInfo = existingPersonalInfo[0]

    // Verificar unicidad del alias público si se está actualizando
    if (input.social_networks.public_alias) {
      const existingAliasUsers = await personalInfoService.listPersonalInformations({})
      const aliasExists = existingAliasUsers.some(user => 
        user.customer_id !== input.customer_id && 
        user.social_url && 
        typeof user.social_url === 'object' && 
        (user.social_url as any).public_alias === input.social_networks.public_alias
      )

      if (aliasExists) {
        throw new Error("Este alias ya existe, por favor elige otro")
      }
    }

    // Preparar el objeto de redes sociales
    const socialNetworksData = {
      facebook: input.social_networks.facebook || "",
      instagram: input.social_networks.instagram || "",
      youtube: input.social_networks.youtube || "",
      tiktok: input.social_networks.tiktok || "",
      public_alias: input.social_networks.public_alias || ""
    }

    // Filtrar solo las redes sociales que tienen contenido
    const filteredSocialNetworks = Object.fromEntries(
      Object.entries(socialNetworksData).filter(([_, value]) => value && value.trim() !== "")
    )

    if (personalInfo) {
      // Actualizar información personal existente
      const updatedPersonalInfo = await personalInfoService.updatePersonalInformations({
        id: personalInfo.id,
        social_url: filteredSocialNetworks
      })

    

      return new StepResponse(
        {
          id: updatedPersonalInfo.id,
          customer_id: updatedPersonalInfo.customer_id,
          social_url: updatedPersonalInfo.social_url
        },
        // Compensation function to revert the update
        async () => {
          await personalInfoService.updatePersonalInformations({
            id: personalInfo.id,
            social_url: personalInfo.social_url
          })
        }
      )
    } else {
      // Crear nueva información personal
      const newPersonalInfo = await personalInfoService.createPersonalInformations({
        customer_id: input.customer_id,
        social_url: filteredSocialNetworks
      })

    

      return new StepResponse(
        {
          id: newPersonalInfo.id,
          customer_id: newPersonalInfo.customer_id,
          social_url: newPersonalInfo.social_url
        },
        // Compensation function to delete the created record
        async () => {
          await personalInfoService.deletePersonalInformations(newPersonalInfo.id)
        }
      )
    }
  }
)
