export const fetchListStoreProduct = async (limit: number = 20, offset: number = 0, categoryId?: string | null, search?: string) => {
    // LOG: Detectar de dónde viene la petición (sin stack trace para no saturar console)
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
      console.log(`[${timestamp}] 📥 FETCH: limit=${limit}, offset=${offset}, cat=${categoryId ? categoryId.slice(-6) : 'TODAS'}, search=${search || 'none'}`);
      console.log(`[${timestamp}] 🔗 URL: ${backendUrl}/store/product/`);
      
      // Construir URL con parámetros
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      
      // Si hay búsqueda, NO enviar category_id (buscar en todos los productos)
      // Si no hay búsqueda, enviar category_id si se proporciona
      if (search && search.trim()) {
        // Búsqueda activa: ignorar categoría y buscar en todos los productos
        params.append('search', search.trim())
      } else if (categoryId) {
        // Sin búsqueda: aplicar filtro de categoría
        params.append('category_id', categoryId)
      }
      
      const fullUrl = `${backendUrl}/store/product/?${params.toString()}`;
      console.log(`[${timestamp}] 🌐 Llamando a: ${fullUrl}`);
      
      let response: Response;
      try {
        console.log(`[${timestamp}] 🔄 Iniciando fetch a: ${fullUrl}`);
        response = await fetch(fullUrl, {
          method: "GET",
          credentials: "include",
          headers: {
            "x-publishable-api-key":
              process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
            "Content-Type": "application/json",
          },
        });
        console.log(`[${timestamp}] ✅ Fetch completado, status: ${response.status} ${response.statusText}`);
        console.log(`[${timestamp}] 📡 Response headers:`, {
          'content-type': response.headers.get('content-type'),
          'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        });
      } catch (fetchError: any) {
        console.error(`[${timestamp}] ❌ Error de red al hacer fetch:`, {
          message: fetchError?.message,
          name: fetchError?.name,
          stack: fetchError?.stack,
          error: fetchError
        });
        // No lanzar error, devolver array vacío para que el frontend no falle
        return {
          products: [],
          hasMore: false,
          total: 0
        };
      }
  
      console.log(`[${timestamp}] 📡 Response status: ${response.status} ${response.statusText}`);
  
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'No se pudo leer el mensaje de error';
        }
        console.error(`[${timestamp}] ❌ Error response (${response.status}):`, errorText);
        // En lugar de lanzar error, devolver array vacío
        console.warn(`[${timestamp}] ⚠️ Devolviendo productos vacíos debido a error ${response.status}`);
        return {
          products: [],
          hasMore: false,
          total: 0
        };
      }
  
      let result: any;
      try {
        result = await response.json();
      } catch (jsonError: any) {
        console.error(`[${timestamp}] ❌ Error parseando JSON:`, jsonError);
        throw new Error(`Error al parsear la respuesta del servidor: ${jsonError?.message || 'Formato JSON inválido'}`);
      }
      
      console.log(`[${timestamp}] ✅ Response recibida:`, {
        productsCount: result.products?.length || 0,
        hasMore: result.hasMore,
        count: result.count
      });
      
      // Validar que result.products existe y es un array
      if (!result.products) {
        console.warn(`[${timestamp}] ⚠️ No hay campo 'products' en la respuesta:`, result);
        return {
          products: [],
          hasMore: false,
          total: 0
        };
      }
      
      // Validar que products es un array
      if (!Array.isArray(result.products)) {
        console.error(`[${timestamp}] ❌ 'products' no es un array:`, typeof result.products, result.products);
        return {
          products: [],
          hasMore: false,
          total: 0
        };
      }
      
      // Transformar productos al formato esperado por el frontend
      const transformedProducts = result.products.map((product: any) => {
        try {
          // Validar que product es un objeto válido
          if (!product || typeof product !== 'object') {
            console.warn(`[${timestamp}] ⚠️ Producto inválido (no es objeto):`, product);
            return null;
          }
          
          // Validar que product tiene id
          if (!product.id) {
            console.warn(`[${timestamp}] ⚠️ Producto sin id:`, product);
            return null;
          }
          
          // Obtener la primera imagen como thumbnail
          const thumbnail = (product.images && Array.isArray(product.images) && product.images.length > 0) 
            ? product.images[0] 
            : null;
          
          // Transformar variantes al formato esperado por el frontend
          // Validar que variants es un array
          const variants = Array.isArray(product.variants) ? product.variants : [];
          const transformedVariants = variants
            .map((variant: any) => {
              // El precio viene en centavos desde el backend, convertir a pesos (dividir por 100)
              const priceInPesos = variant.price ? Math.round(variant.price / 100) : 0;
              
              // Validar que variant tiene propiedades mínimas
              if (!variant || !variant.id) {
                console.warn(`[${timestamp}] ⚠️ Variante inválida:`, variant);
                return null;
              }
              
              return {
                id: variant.id || '',
                sku: variant.sku || '',
                title: variant.title || '',
                // Formato compatible con el frontend (inventory object)
                inventory: {
                  price: priceInPesos, // Precio en pesos (convertido de centavos)
                  currency_code: 'COP', // Moneda por defecto
                  quantity_stock: variant.stock || 0,
                },
                // Mantener formato original también para compatibilidad
                price: variant.price || 0, // Precio original en centavos
                stock: variant.stock || 0,
                active: variant.active !== false,
              };
            })
            .filter((v: any) => v !== null); // Filtrar variantes nulas
          
          // Si no hay variantes válidas, el producto no es válido
          if (transformedVariants.length === 0) {
            console.warn(`[${timestamp}] ⚠️ Producto ${product.id} sin variantes válidas`);
            return null;
          }
          
          // Construir objeto producto compatible con el tipo Product del frontend
          // Convertir fechas a strings si vienen como Date objects
          const formatDate = (date: any): string => {
            if (!date) return new Date().toISOString();
            if (typeof date === 'string') return date;
            if (date instanceof Date) return date.toISOString();
            return new Date(date).toISOString();
          };
          
          const transformedProduct: any = {
            id: product.id,
            title: product.title || '',
            description: product.description || null,
            handle: product.handle || '',
            status: product.active !== false ? 'published' : 'draft', // Mapear active a status
            thumbnail: thumbnail, // Primera imagen como thumbnail
            variants: transformedVariants,
            created_at: formatDate(product.created_at),
            updated_at: formatDate(product.updated_at),
            // Campos adicionales que pueden ser útiles
            images: product.images || [],
            active: product.active !== false,
          };
          
          return transformedProduct;
        } catch (transformError: any) {
          console.error(`[${timestamp}] ❌ Error transformando producto ${product?.id || 'unknown'}:`, {
            message: transformError?.message,
            error: transformError
          });
          return null;
        }
      })
      .filter((p: any) => p !== null); // Filtrar productos nulos
      
      // Log solo para los primeros 3 productos para no saturar la consola
      if (transformedProducts.length > 0 && transformedProducts.length <= 3) {
        transformedProducts.slice(0, 3).forEach((p: any, idx: number) => {
          console.log(`[${timestamp}] 🔍 Producto ${idx + 1} transformado:`, {
            id: p.id,
            title: p.title,
            thumbnail: p.thumbnail ? '✅' : '❌',
            thumbnailUrl: p.thumbnail ? p.thumbnail.substring(0, 50) + '...' : 'sin imagen',
            variants: p.variants?.length || 0,
            hasPrice: !!p.variants?.[0]?.inventory?.price,
            price: p.variants?.[0]?.inventory?.price,
            status: p.status
          });
        });
      }
     
      console.log(`[${timestamp}] ✅ Productos transformados: ${transformedProducts.length}`);
      
      return {
        products: transformedProducts,
        hasMore: result.hasMore || false,
        total: result.count || 0
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Error desconocido al obtener productos';
      console.error(`[${timestamp}] ❌ Error capturado:`, {
        message: errorMessage,
        name: error?.name,
        // No loggear stack completo para no saturar
      });
      
      // En lugar de lanzar error, devolver array vacío para que el frontend no falle
      // El frontend puede manejar un array vacío de productos
      return {
        products: [],
        hasMore: false,
        total: 0
      };
    }
  }
  