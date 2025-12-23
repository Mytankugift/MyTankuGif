import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors/AppError';
import { env } from '../../config/env';

export interface ProductListQuery {
  limit?: number;
  offset?: number;
  category_id?: string;
  search?: string;
}

export interface ProductResponse {
  id: string;
  title: string;
  handle: string;
  description?: string;
  images: string[];
  category?: {
    id: string;
    name: string;
    handle: string;
  };
  variants: Array<{
    id: string;
    sku: string;
    title: string;
    price: number; // en centavos
    stock: number;
    active: boolean;
  }>;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class ProductsService {
  /**
   * Listar productos con paginación y filtros
   */
  async listProducts(query: ProductListQuery): Promise<{
    products: ProductResponse[];
    count: number;
    hasMore: boolean;
  }> {
    const limit = Math.min(query.limit || 12, 100); // Máximo 100
    const offset = query.offset || 0;

    // Temporalmente mostrar todos los productos (activos e inactivos) para debugging
    // TODO: Volver a filtrar solo activos cuando esté listo
    const where: any = {
      // active: true, // Comentado temporalmente para ver todos los productos
    };

    // Si hay búsqueda, ignorar el filtro de categoría (buscar en todos los productos)
    if (query.search) {
      console.log(`🔍 [PRODUCTS SERVICE] Búsqueda activa: "${query.search}" - Ignorando filtro de categoría`);
      // Cuando hay búsqueda, NO aplicar filtro de categoría para buscar en todos los productos
    } else if (query.category_id) {
      console.log(`📦 [PRODUCTS SERVICE] Filtrando por categoría: ${query.category_id}`);
      
      // Verificar si la categoría existe
      const categoryExists = await prisma.category.findUnique({
        where: { id: query.category_id },
        select: { id: true, name: true, handle: true },
      });
      
      if (!categoryExists) {
        console.log(`⚠️ [PRODUCTS SERVICE] La categoría ${query.category_id} NO existe en la BD - Mostrando todos los productos`);
        // No aplicar filtro de categoría si la categoría no existe
      } else {
        console.log(`✅ [PRODUCTS SERVICE] Categoría encontrada: ${categoryExists.name} (${categoryExists.handle})`);
        
        // Verificar cuántos productos tienen esta categoría
        const productsWithCategory = await prisma.product.count({
          where: { categoryId: query.category_id },
        });
        console.log(`📦 [PRODUCTS SERVICE] Productos con esta categoría en BD: ${productsWithCategory}`);
        
        if (productsWithCategory === 0) {
          console.log(`⚠️ [PRODUCTS SERVICE] La categoría no tiene productos - Mostrando todos los productos`);
          // No aplicar filtro de categoría si no tiene productos
        } else {
          // Aplicar filtro de categoría solo si tiene productos
          where.categoryId = query.category_id;
        }
        
        // Verificar productos sin categoría
        const productsWithoutCategory = await prisma.product.count({
          where: { categoryId: null },
        });
        console.log(`📦 [PRODUCTS SERVICE] Productos SIN categoría en BD: ${productsWithoutCategory}`);
        
        // Verificar productos con otras categorías
        const productsWithOtherCategories = await prisma.product.count({
          where: {
            categoryId: query.category_id ? { not: query.category_id } : { not: null },
          },
        });
        console.log(`📦 [PRODUCTS SERVICE] Productos con otras categorías: ${productsWithOtherCategories}`);
      }
    }

    if (query.search) {
      // Búsqueda mejorada: buscar en título, descripción y variantes (SKU, título)
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { 
          variants: {
            some: {
              OR: [
                { sku: { contains: query.search, mode: 'insensitive' } },
                { title: { contains: query.search, mode: 'insensitive' } },
              ]
            }
          }
        },
      ];
      console.log(`🔍 [PRODUCTS SERVICE] Búsqueda: "${query.search}" - Buscando en título, descripción y variantes`);
    }

    // Log de la query que se va a ejecutar
    console.log(`📦 [PRODUCTS SERVICE] Ejecutando query con where:`, JSON.stringify(where, null, 2));
    
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              handle: true,
            },
          },
          variants: {
            // where: { active: true }, // Comentado temporalmente para ver todas las variantes
            orderBy: { price: 'asc' },
            include: {
              warehouseVariants: {
                select: {
                  stock: true,
                },
              },
            } as any,
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    console.log(`📦 [PRODUCTS SERVICE] ========== RESULTADO CONSULTA ==========`);
    console.log(`📦 [PRODUCTS SERVICE] Productos encontrados: ${products.length} de ${totalCount} totales`);
    console.log(`📦 [PRODUCTS SERVICE] Query params:`, {
      limit,
      offset,
      category_id: query.category_id,
      search: query.search,
    });
    
    // Verificar total en BD sin filtros
    const totalInDB = await prisma.product.count();
    console.log(`📦 [PRODUCTS SERVICE] Total de productos en BD (sin filtros): ${totalInDB}`);
    
    if (products.length > 0) {
      console.log(`📦 [PRODUCTS SERVICE] Primer producto:`, {
        id: products[0].id,
        title: products[0].title,
        handle: products[0].handle,
        imagesCount: products[0].images?.length || 0,
        variantsCount: products[0].variants?.length || 0,
        category: products[0].category?.name || 'Sin categoría',
        active: products[0].active,
      });
    } else {
      console.log(`⚠️ [PRODUCTS SERVICE] No se encontraron productos con los filtros aplicados`);
      console.log(`⚠️ [PRODUCTS SERVICE] Total en BD: ${totalInDB}`);
      if (totalInDB > 0) {
        console.log(`⚠️ [PRODUCTS SERVICE] Hay ${totalInDB} productos pero no coinciden con los filtros`);
        
        // Si se está filtrando por categoría, mostrar información detallada
        if (query.category_id) {
          // Mostrar algunos productos de ejemplo con sus categorías
          const sampleProducts = await prisma.product.findMany({
            take: 5,
            select: {
              id: true,
              title: true,
              active: true,
              categoryId: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  handle: true,
                },
              },
            },
          });
          console.log(`📦 [PRODUCTS SERVICE] Productos de ejemplo en BD (primeros 5):`, sampleProducts.map(p => ({
            id: p.id,
            title: p.title,
            categoryId: p.categoryId,
            categoryName: p.category?.name || 'Sin categoría',
            categoryHandle: p.category?.handle || 'N/A',
          })));
          
          // Mostrar todas las categorías que tienen productos
          const categoriesWithProducts = await prisma.product.groupBy({
            by: ['categoryId'],
            _count: {
              id: true,
            },
            where: {
              categoryId: { not: null },
            },
          });
          
          console.log(`📦 [PRODUCTS SERVICE] Categorías que tienen productos:`, categoriesWithProducts.map(c => ({
            categoryId: c.categoryId,
            productCount: c._count.id,
          })));
        } else {
          // Mostrar un producto de ejemplo sin filtros
          const sampleProduct = await prisma.product.findFirst({
            select: {
              id: true,
              title: true,
              active: true,
              categoryId: true,
            },
          });
          if (sampleProduct) {
            console.log(`📦 [PRODUCTS SERVICE] Producto de ejemplo en BD:`, sampleProduct);
          }
        }
      } else {
        console.log(`⚠️ [PRODUCTS SERVICE] No hay productos en la tabla 'products'`);
        console.log(`⚠️ [PRODUCTS SERVICE] Ejecuta: POST /api/v1/dropi/sync para sincronizar productos`);
      }
    }
    console.log(`📦 [PRODUCTS SERVICE] ==========================================`);

    // Normalizar URLs de imágenes
    const cdnBase = env.DROPI_CDN_BASE || 'https://d39ru7awumhhs2.cloudfront.net';
    const normalizeImageUrl = (imagePath: string): string => {
      // Si ya es una URL completa, devolverla tal cual
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      // Si es un path relativo, construir URL completa
      const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
      return `${cdnBase}/${cleanPath}`;
    };

    const formattedProducts: ProductResponse[] = products.map((product) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description || undefined,
      images: product.images.map(normalizeImageUrl), // Normalizar todas las imágenes
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            handle: product.category.handle,
          }
        : undefined,
      variants: product.variants.map((variant: any) => {
        // Calcular stock sumando todos los warehouseVariants
        const totalStock = variant.warehouseVariants?.reduce(
          (sum: number, wv: any) => sum + (wv.stock || 0),
          0
        ) || 0;

        return {
          id: variant.id,
          sku: variant.sku,
          title: variant.title,
          price: variant.suggestedPrice || variant.price, // Usar suggestedPrice como prioridad, fallback a price
          suggestedPrice: variant.suggestedPrice || null, // Incluir también suggestedPrice explícitamente
          stock: totalStock,
          active: variant.active,
        };
      }),
      active: product.active,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    }));

    return {
      products: formattedProducts,
      count: totalCount,
      hasMore: offset + limit < totalCount,
    };
  }

  /**
   * Obtener producto por handle
   */
  async getProductByHandle(handle: string): Promise<ProductResponse> {
    const product = await prisma.product.findUnique({
      where: { handle },
      include: {
        category: true,
        variants: {
          where: { active: true },
          orderBy: { price: 'asc' },
          include: {
            warehouseVariants: {
              select: {
                stock: true,
              },
            },
          } as any,
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Normalizar URLs de imágenes
    const cdnBase = env.DROPI_CDN_BASE || 'https://d39ru7awumhhs2.cloudfront.net';
    const normalizeImageUrl = (imagePath: string): string => {
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
      return `${cdnBase}/${cleanPath}`;
    };

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description || undefined,
      images: product.images.map(normalizeImageUrl),
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            handle: product.category.handle,
          }
        : undefined,
      variants: product.variants.map((variant: any) => {
        // Calcular stock sumando todos los warehouseVariants
        const totalStock = variant.warehouseVariants?.reduce(
          (sum: number, wv: any) => sum + (wv.stock || 0),
          0
        ) || 0;

        return {
          id: variant.id,
          sku: variant.sku,
          title: variant.title,
          price: variant.suggestedPrice || variant.price, // Usar suggestedPrice como prioridad, fallback a price
          suggestedPrice: variant.suggestedPrice || null, // Incluir también suggestedPrice explícitamente
          stock: totalStock,
          active: variant.active,
        };
      }),
      active: product.active,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  /**
   * Obtener producto por ID
   */
  async getProductById(id: string): Promise<ProductResponse> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: {
          where: { active: true },
          orderBy: { price: 'asc' },
          include: {
            warehouseVariants: {
              select: {
                stock: true,
              },
            },
          } as any,
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Normalizar URLs de imágenes
    const cdnBase = env.DROPI_CDN_BASE || 'https://d39ru7awumhhs2.cloudfront.net';
    const normalizeImageUrl = (imagePath: string): string => {
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
      return `${cdnBase}/${cleanPath}`;
    };

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description || undefined,
      images: product.images.map(normalizeImageUrl),
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            handle: product.category.handle,
          }
        : undefined,
      variants: product.variants.map((variant: any) => {
        // Calcular stock sumando todos los warehouseVariants
        const totalStock = variant.warehouseVariants?.reduce(
          (sum: number, wv: any) => sum + (wv.stock || 0),
          0
        ) || 0;

        return {
          id: variant.id,
          sku: variant.sku,
          title: variant.title,
          price: variant.suggestedPrice || variant.price, // Usar suggestedPrice como prioridad, fallback a price
          suggestedPrice: variant.suggestedPrice || null, // Incluir también suggestedPrice explícitamente
          stock: totalStock,
          active: variant.active,
        };
      }),
      active: product.active,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }
}
