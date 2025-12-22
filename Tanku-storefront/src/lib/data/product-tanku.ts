export const fetchTankuProduct = async (handle: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/product/tanku/${handle}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "x-publishable-api-key":
              process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
          },
        }
      )
  
  
      const result = await response.json()
      const product = result.product
      
      // Transformar variantes al formato esperado por el frontend (con inventory object)
      if (product && product.variants && Array.isArray(product.variants)) {
        product.variants = product.variants.map((variant: any) => {
          // El precio viene en centavos desde el backend, convertir a pesos (dividir por 100)
          const priceInPesos = variant.price ? Math.round(variant.price / 100) : 0;
          
          return {
            ...variant,
            // Formato compatible con el frontend (inventory object)
            inventory: {
              price: priceInPesos, // Precio en pesos (convertido de centavos)
              currency_code: 'COP', // Moneda por defecto
              quantity_stock: variant.stock || 0,
            },
            // Mantener formato original también para compatibilidad
            price: variant.price || 0, // Precio original en centavos
            stock: variant.stock || 0,
          };
        });
      }
     
      return product
    } catch (error) {
      console.error("Error al obtener los datos:", error)
      throw error
    }
  }
  