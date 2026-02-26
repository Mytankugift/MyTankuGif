import { prisma } from '../../config/database';
import { NotFoundError, ConflictError } from '../../shared/errors/AppError';
import { env } from '../../config/env';
import {
  CategoryDTO,
  ProductVariantDTO,
  ProductDTO,
  ProductListDTO,
} from '../../shared/dto/products.dto';
import { normalizePagination, createPaginatedResult } from '../../shared/pagination';
import type { Product, ProductVariant, Category } from '@prisma/client';
import { WishListsService } from '../wishlists/wishlists.service';
import { FeedService } from '../feed/feed.service';
import { getBlockedCategoryIds } from '../../shared/utils/category.utils';

export interface ProductListQuery {
  page?: number;
  limit?: number;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  active?: boolean;
  search?: string;
  sortBy?: 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// Mantener interfaces antiguas para compatibilidad temporal
export interface ProductListQueryOld {
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
    tankuPrice: number;
    stock: number;
    active: boolean;
  }>;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class ProductsService {
  private wishListsService: WishListsService;
  private feedService: FeedService;

  constructor() {
    this.wishListsService = new WishListsService();
    this.feedService = new FeedService();
  }

  /**
   * Normalizar URL de imagen
   */
  private normalizeImageUrl(imagePath: string): string {
    const cdnBase = env.DROPI_CDN_BASE || 'https://d39ru7awumhhs2.cloudfront.net';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    return `${cdnBase}/${cleanPath}`;
  }

  /**
   * Mapper: Category de Prisma a CategoryDTO
   */
  private mapCategoryToDTO(category: Category | null): CategoryDTO | null {
    if (!category) return null;
    return {
      id: category.id,
      name: category.name,
      handle: category.handle,
      parentId: category.parentId,
      imageUrl: category.imageUrl || null,
    };
  }

  /**
   * Mapper: ProductVariant de Prisma a ProductVariantDTO
   */
  private mapVariantToDTO(variant: ProductVariant & { warehouseVariants?: { stock: number }[] }): ProductVariantDTO {
    const totalStock = variant.warehouseVariants?.reduce(
      (sum, wv) => sum + (wv.stock || 0),
      0
    ) || 0;

    return {
      id: variant.id,
      sku: variant.sku,
      title: variant.title,
      tankuPrice: variant.tankuPrice || 0, // Precio final (tankuPrice)
      stock: totalStock,
      active: variant.active,
      attributes: variant.attributes as Record<string, any> | null,
    };
  }

  /**
   * Mapper: Product de Prisma a ProductDTO
   */
  private mapProductToDTO(
    product: Product & {
      category?: Category | null;
      variants?: (ProductVariant & { warehouseVariants?: { stock: number }[] })[];
      hiddenImages?: string[];
    }
  ): ProductDTO {
    // Filtrar imágenes bloqueadas
    const hiddenImages = product.hiddenImages || [];
    const visibleImages = product.images
      .filter(img => !hiddenImages.includes(img))
      .map((img) => this.normalizeImageUrl(img));

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description,
      images: visibleImages,
      active: product.active,
      category: this.mapCategoryToDTO(product.category || null),
      variants: (product.variants || []).map((v) => this.mapVariantToDTO(v)),
    };
  }

  /**
   * Mapper: Product de Prisma a ProductListDTO (versión simplificada para listados)
   */
  private mapProductToListDTO(
    product: Product & {
      category?: Category | null;
      variants?: ProductVariant[];
      hiddenImages?: string[];
    }
  ): ProductListDTO {
    // Filtrar imágenes bloqueadas y obtener la primera visible
    const hiddenImages = product.hiddenImages || [];
    const visibleImages = (product.images || []).filter(img => !hiddenImages.includes(img));
    const firstVisibleImage = visibleImages.length > 0 ? visibleImages[0] : null;

    const minPrice = product.variants && product.variants.length > 0
      ? Math.min(...product.variants.map((v) => v.tankuPrice || 0).filter(p => p > 0))
      : 0;

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      image: firstVisibleImage ? this.normalizeImageUrl(firstVisibleImage) : null,
      minPrice,
      active: product.active,
    };
  }

  /**
   * Listar productos con paginación y filtros (NUEVO - Normalizado)
   */
  async listProductsNormalized(query: ProductListQuery) {
    const { page, limit, skip } = normalizePagination(query, { page: 1, limit: 20 });

    // Obtener IDs de categorías bloqueadas
    const blockedCategoryIds = await getBlockedCategoryIds();

    const where: any = {};

    // Filtro por categoría
    if (query.category) {
      // Verificar si la categoría solicitada está bloqueada
      if (blockedCategoryIds.includes(query.category)) {
        // La categoría está bloqueada, retornar lista vacía
        return createPaginatedResult([], page, limit, 0);
      }
      where.categoryId = query.category;
    } else {
      // Si no hay filtro de categoría, excluir productos de categorías bloqueadas
      if (blockedCategoryIds.length > 0) {
        where.categoryId = {
          notIn: blockedCategoryIds,
        };
      }
    }

    // Filtro por active
    if (query.active !== undefined) {
      where.active = query.active;
    }

    // Filtro por búsqueda
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filtro por precio (aplicado a variantes)
    const variantWhere: any = {};
    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      variantWhere.price = {};
      if (query.priceMin !== undefined) variantWhere.price.gte = query.priceMin;
      if (query.priceMax !== undefined) variantWhere.price.lte = query.priceMax;
    }

    // Ordenamiento
    const orderBy: any[] = [];
    if (query.sortBy === 'price') {
      orderBy.push({ variants: { _min: { price: query.sortOrder || 'asc' } } });
    } else if (query.sortBy === 'createdAt') {
      orderBy.push({ createdAt: query.sortOrder || 'desc' });
    } else {
      orderBy.push({ createdAt: 'desc' }); // Default
    }

    // Contar total
    const total = await prisma.product.count({ where });

    // Obtener productos
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          where: Object.keys(variantWhere).length > 0 ? variantWhere : undefined,
          include: {
            warehouseVariants: {
              select: { stock: true },
            },
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    const items = products.map((p) => this.mapProductToListDTO(p));

    return createPaginatedResult(items, page, limit, total);
  }

  /**
   * Listar productos con paginación y filtros (LEGACY - Mantener para compatibilidad)
   */
  async listProducts(query: ProductListQueryOld): Promise<{
    products: ProductResponse[];
    count: number;
    hasMore: boolean;
  }> {
    const limit = Math.min(query.limit || 12, 100); // Máximo 100
    const offset = query.offset || 0;

    // Obtener IDs de categorías bloqueadas
    const blockedCategoryIds = await getBlockedCategoryIds();

    // Temporalmente mostrar todos los productos (activos e inactivos) para debugging
    // TODO: Volver a filtrar solo activos cuando esté listo
    const where: any = {
      // active: true, // Comentado temporalmente para ver todos los productos
      // Excluir productos de categorías bloqueadas
      ...(blockedCategoryIds.length > 0 && {
        categoryId: {
          notIn: blockedCategoryIds,
        },
      }),
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
          tankuPrice: variant.tankuPrice || 0, // Precio final (tankuPrice)
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
   * Obtener producto por handle (NUEVO - Normalizado con DTO)
   */
  async getProductByHandleNormalized(handle: string): Promise<ProductDTO> {
    // Obtener IDs de categorías bloqueadas
    const blockedCategoryIds = await getBlockedCategoryIds();
    
    const product = await prisma.product.findUnique({
      where: { 
        handle,
        // Excluir productos de categorías bloqueadas
        ...(blockedCategoryIds.length > 0 && {
          categoryId: {
            notIn: blockedCategoryIds,
          },
        }),
      },
      include: {
        category: true,
        variants: {
          where: { active: true },
          orderBy: { price: 'asc' },
          include: {
            warehouseVariants: {
              select: { stock: true },
            },
          },
        },
      },
      // Incluir hiddenImages para filtrar
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    return this.mapProductToDTO(product);
  }

  /**
   * Obtener producto por handle (LEGACY - Mantener para compatibilidad)
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

    // Filtrar imágenes bloqueadas
    const hiddenImages = product.hiddenImages || [];
    const visibleImages = (product.images || [])
      .filter(img => !hiddenImages.includes(img))
      .map(normalizeImageUrl);

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description || undefined,
      images: visibleImages,
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
          tankuPrice: variant.tankuPrice || 0, // Precio final (tankuPrice)
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

    // Filtrar imágenes bloqueadas
    const hiddenImages = product.hiddenImages || [];
    const visibleImages = (product.images || [])
      .filter(img => !hiddenImages.includes(img))
      .map(normalizeImageUrl);

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description || undefined,
      images: visibleImages,
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
          tankuPrice: variant.tankuPrice || 0, // Precio final (tankuPrice)
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
   * Obtener información de una variante por su ID (incluye producto)
   */
  async getVariantById(variantId: string): Promise<{
    id: string;
    title: string;
    sku: string;
    price: number;
    tankuPrice: number | null;
    stock: number;
    product: {
      id: string;
      title: string;
      handle: string;
      images: string[];
    };
  }> {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            handle: true,
            images: true,
          },
        },
        warehouseVariants: {
          select: { stock: true },
        },
      },
    });

    if (!variant) {
      throw new NotFoundError('Variante no encontrada');
    }

    // Calcular stock total
    const totalStock = variant.warehouseVariants?.reduce(
      (sum, wv) => sum + (wv.stock || 0),
      0
    ) || 0;

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
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      price: variant.price,
      tankuPrice: variant.tankuPrice,
      stock: totalStock,
      product: {
        id: variant.product.id,
        title: variant.product.title,
        handle: variant.product.handle,
        images: variant.product.images.map(normalizeImageUrl),
      },
    };
  }

  /**
   * Obtener top 50 productos para StalkerGift (usuarios externos)
   * Ordenados por popularidad/ventas
   */
  async getTopProducts(limit: number = 50): Promise<ProductDTO[]> {
    console.log(`📦 [PRODUCTS] Obteniendo top ${limit} productos para StalkerGift`);

    // Obtener productos activos (similar al feed, sin filtrar por stock)
    // Por ahora, ordenados por fecha de creación (desc) y luego por precio
    // TODO: Mejorar algoritmo con métricas de ventas/popularidad
    const products = await prisma.product.findMany({
      where: {
        active: true,
        variants: {
          some: {
            active: true,
            // No filtrar por stock aquí - el stock se valida después en el checkout
            // Permitir todos los productos activos, similar al feed
          },
        },
      },
      include: {
        category: true,
        variants: {
          where: {
            active: true,
          },
          include: {
            warehouseVariants: {
              select: {
                stock: true,
              },
            },
          },
          orderBy: {
            price: 'asc', // Ordenar variantes por precio
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' }, // Más recientes primero
        { title: 'asc' }, // Luego alfabéticamente
      ],
      take: limit,
    });

    console.log(`✅ [PRODUCTS] Productos encontrados: ${products.length}`);

    return products.map((product) => this.mapProductToDTO(product));
  }

  /**
   * Dar like a un producto
   * Crea la wishlist automática "Me gusta" si no existe
   * Agrega el producto a la wishlist automática
   * Actualiza métricas de feed
   */
  async likeProduct(productId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Verificar si ya tiene like
    const existingLike = await prisma.productLike.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingLike) {
      throw new ConflictError('Ya le diste like a este producto');
    }

    // Crear el like
    await prisma.productLike.create({
      data: {
        userId,
        productId,
      },
    });

    // Obtener o crear wishlist automática "Me gusta"
    let likedWishlist = await prisma.wishList.findFirst({
      where: {
        userId,
        isAutoGenerated: true,
      },
    });

    if (!likedWishlist) {
      // Crear wishlist automática
      likedWishlist = await prisma.wishList.create({
        data: {
          userId,
          name: 'Me gusta',
          public: true, // Pública por defecto
          isAutoGenerated: true,
        },
      });
    }

    // Agregar producto a la wishlist automática (si no está ya)
    const existingItem = await prisma.wishListItem.findFirst({
      where: {
        wishListId: likedWishlist.id,
        productId,
      },
    });

    if (!existingItem) {
      // Obtener la primera variante del producto
      const firstVariant = await prisma.productVariant.findFirst({
        where: { productId },
        orderBy: { price: 'asc' },
      });

      await prisma.wishListItem.create({
        data: {
          wishListId: likedWishlist.id,
          productId,
          variantId: firstVariant?.id || null,
        },
      });
    }

    // Actualizar métricas de feed (likesCount)
    // Obtener métricas actuales
    const currentMetrics = await (prisma as any).itemMetric.findUnique({
      where: {
        itemId_itemType: {
          itemId: productId,
          itemType: 'product',
        },
      },
    });

    const currentLikesCount = currentMetrics?.likesCount || 0;
    
    await this.feedService.updateItemMetrics(productId, 'product', {
      likesCount: currentLikesCount + 1,
    });

    // Obtener contador actualizado
    const likesCount = await prisma.productLike.count({
      where: { productId },
    });

    return { liked: true, likesCount };
  }

  /**
   * Quitar like de un producto
   * Remueve el producto de la wishlist automática "Me gusta"
   * Actualiza métricas de feed
   */
  async unlikeProduct(productId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    // Verificar que el like existe
    const existingLike = await prisma.productLike.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!existingLike) {
      throw new NotFoundError('No le has dado like a este producto');
    }

    // Eliminar el like
    await prisma.productLike.delete({
      where: {
        id: existingLike.id,
      },
    });

    // Obtener wishlist automática "Me gusta"
    const likedWishlist = await prisma.wishList.findFirst({
      where: {
        userId,
        isAutoGenerated: true,
      },
    });

    // Remover producto de la wishlist automática (si existe)
    if (likedWishlist) {
      await prisma.wishListItem.deleteMany({
        where: {
          wishListId: likedWishlist.id,
          productId,
        },
      });
    }

    // Actualizar métricas de feed (likesCount)
    // Obtener métricas actuales
    const currentMetrics = await (prisma as any).itemMetric.findUnique({
      where: {
        itemId_itemType: {
          itemId: productId,
          itemType: 'product',
        },
      },
    });

    const currentLikesCount = currentMetrics?.likesCount || 0;
    
    await this.feedService.updateItemMetrics(productId, 'product', {
      likesCount: Math.max(0, currentLikesCount - 1), // No permitir valores negativos
    });

    // Obtener contador actualizado
    const likesCount = await prisma.productLike.count({
      where: { productId },
    });

    return { liked: false, likesCount };
  }

  /**
   * Obtener contador de likes de un producto
   */
  async getProductLikesCount(productId: string): Promise<number> {
    return await prisma.productLike.count({
      where: { productId },
    });
  }

  /**
   * Verificar si un usuario le dio like a un producto
   */
  async isProductLiked(productId: string, userId: string): Promise<boolean> {
    const like = await prisma.productLike.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
    return !!like;
  }

  /**
   * Obtener productos que le gustan a un usuario
   */
  async getLikedProducts(userId: string, limit: number = 50, offset: number = 0): Promise<{
    products: ProductDTO[];
    total: number;
    hasMore: boolean;
  }> {
    const [likes, total] = await Promise.all([
      prisma.productLike.findMany({
        where: { userId },
        include: {
          product: {
            include: {
              category: true,
              variants: {
                where: { active: true },
                orderBy: { price: 'asc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.productLike.count({
        where: { userId },
      }),
    ]);

    const products = likes.map((like) => this.mapProductToDTO(like.product));

    return {
      products,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Obtener wishlist automática "Me gusta" de un usuario
   */
  async getLikedWishlist(userId: string) {
    return await prisma.wishList.findFirst({
      where: {
        userId,
        isAutoGenerated: true,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                variants: {
                  where: { active: true },
                  orderBy: { price: 'asc' },
                },
              },
            },
            variant: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
}
