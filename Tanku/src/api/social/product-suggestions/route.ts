import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { limit = "10", category_id } = req.query

    const productModuleService = req.scope.resolve(Modules.PRODUCT)

    // Obtener productos con variantes e inventario
    const products = await productModuleService.listProducts()

    // Limitar resultados manualmente
    const limitedProducts = products.slice(0, parseInt(limit as string))

    // Obtener variantes e inventario para cada producto
    const productsWithDetails = await Promise.all(
      limitedProducts.map(async (product: any) => {
        try {
          const variants = await productModuleService.listProductVariants({
            product_id: product.id
          })

          const variantsWithInventory = await Promise.all(
            variants.map(async (variant: any) => {
              try {
                // Obtener precio real del inventario
                const { data: inventoryData } = await req.scope.resolve("query").graph({
                  entity: "variant_inventory_tanku",
                  fields: ["*"],
                  filters: {
                    variant_id: variant.id
                  }
                })

                return {
                  ...variant,
                  inventory: inventoryData[0] ? {
                    price: inventoryData[0].price,
                    currency_code: inventoryData[0].currency_code || "COP"
                  } : null
                }
              } catch (inventoryError) {
                console.error(`Error al obtener inventario para variante ${variant.id}:`, inventoryError)
                return {
                  ...variant,
                  inventory: null
                }
              }
            })
          )

          return {
            ...product,
            variants: variantsWithInventory
          }
        } catch (variantError) {
          console.error(`Error al obtener variantes para producto ${product.id}:`, variantError)
          return {
            ...product,
            variants: []
          }
        }
      })
    )

    res.status(200).json({
      success: true,
      data: productsWithDetails,
      count: productsWithDetails.length
    })

  } catch (error) {
    console.error("Error al obtener sugerencias de productos:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      message: (error as Error).message
    })
  }
}
