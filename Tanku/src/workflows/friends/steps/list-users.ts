import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import PersonalInformationModuleService from "../../../modules/personal_information/service"
import SOCIAL_MODULE from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"
import { PERSONAL_INFORMATION_MODULE } from "../../../modules/personal_information";

export const listUsersStep = createStep(
  "list-users-step",
  async (input, { container }) => {
    const customerModuleService = container.resolve(Modules.CUSTOMER)
    const personalInfoService: PersonalInformationModuleService = container.resolve(
      PERSONAL_INFORMATION_MODULE
    );
    // Recupera todos los customers
    const customers = await customerModuleService.listCustomers({})
    
    const customerPersonalInfo = await Promise.all(customers.map( async (customer) => {
      const data = await personalInfoService.listPersonalInformations({
        customer_id: customer.id
      })
      return {
        ...customer,
        avatar_url: (data && data[0] && data[0].avatar_url) ? data[0].avatar_url : ""
      }
    }))
    // Extrae los nombres
    const customerNames = customerPersonalInfo.map((customer) => ({
      id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      avatar_url: customer.avatar_url
    }))
    return new StepResponse(customerNames, null)
  }
)