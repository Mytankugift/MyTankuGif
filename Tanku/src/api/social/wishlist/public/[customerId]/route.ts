import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getListWishListWorkflow } from "../../../../../workflows/wish_list"
import { Modules } from "@medusajs/framework/utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { customerId } = req.params

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: "customerId es requerido"
      })
    }

    // Obtener todas las wishlists del usuario
    const { result: allWishLists } = await getListWishListWorkflow(req.scope).run({
      input: { customerId }
    })

    // Verificar si el usuario existe y tiene wishlists
    if (!allWishLists || !Array.isArray(allWishLists)) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        message: "Usuario no encontrado o sin wishlists"
      })
    }

    // Filtrar solo las wishlists públicas
    const publicWishLists = allWishLists.filter((wishlist: any) => 
      wishlist && wishlist.state_id === "PUBLIC_ID"
    )

    // Enriquecer productos con información de precios reales
    const enrichedWishLists = await Promise.all(publicWishLists.map(async (wishlist: any) => {
      if (wishlist.products && wishlist.products.length > 0) {
        const enrichedProducts = await Promise.all(wishlist.products.map(async (product: any) => {
          try {
            // Obtener las variantes reales del producto con sus precios
            const { data: variantsData } = await req.scope.resolve("query").graph({
              entity: "variant",
              fields: ["*", "variant_inventory_tanku.*"],
              filters: {
                product_id: product.id
              }
            })

            if (variantsData && variantsData.length > 0) {
              // Usar la primera variante disponible con su precio real
              const firstVariant = variantsData[0]
              return {
                ...product,
                variants: [{
                  id: firstVariant.id,
                  title: firstVariant.title || "Default",
                  inventory: firstVariant.variant_inventory_tanku ? {
                    price: firstVariant.variant_inventory_tanku.price,
                    currency_code: firstVariant.variant_inventory_tanku.currency_code || "COP"
                  } : null
                }]
              }
            } else {
              // Si no hay variantes, crear una variante por defecto sin precio
              return {
                ...product,
                variants: [{
                  id: `variant-${product.id}`,
                  title: "Default",
                  inventory: null
                }]
              }
            }
          } catch (error) {
            console.error(`Error al obtener precios para producto ${product.id}:`, error)
            // En caso de error, devolver sin precio
            return {
              ...product,
              variants: [{
                id: `variant-${product.id}`,
                title: "Default",
                inventory: null
              }]
            }
          }
        }))
        
        return {
          ...wishlist,
          products: enrichedProducts
        }
      }
      return wishlist
    }))

    res.status(200).json({
      success: true,
      data: enrichedWishLists,
      count: enrichedWishLists.length
    })

  } catch (error) {
    console.error("Error al obtener wishlists públicas:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      message: (error as Error).message
    })
  }
}
