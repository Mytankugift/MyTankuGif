import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export interface GetSellerStoreInput {
  customer_id: string
}

export const getSellerStoreStep = createStep(
  "get-seller-store-step",
  async (input: GetSellerStoreInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    
    // Validate required fields
    if (!input.customer_id) {
      throw new Error("customer_id es obligatorio")
    }

    try {
      // Query store linked to the customer (seller)
      const { data: storeData } = await query.graph({
        entity: "customer",
        fields: [
          "store.*"
        ],
        filters: {
          id: input.customer_id
        },
      })

      if (!storeData || storeData.length === 0 || !storeData[0].store) {
        throw new Error("No se encontró tienda para este vendedor")
      }

      const store = storeData[0].store
      
      return new StepResponse(store, null)
    } catch (error) {
      console.error("Error obteniendo tienda del vendedor:", error)
      throw error
    }
  }
)
