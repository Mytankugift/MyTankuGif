import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

export const listUsersStep = createStep(
  "list-users-step",
  async (input, { container }) => {
    const customerModuleService = container.resolve(Modules.CUSTOMER)
    // Recupera todos los customers
    const customers = await customerModuleService.listCustomers({})
    // Extrae los nombres
    const customerNames = customers.map((customer) => ({
      id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
    }))
    return new StepResponse(customerNames, null)
  }
)