import { prisma } from '../../../config/database';
import { NotFoundError, BadRequestError } from '../../../shared/errors/AppError';
import { normalizePagination, createPaginatedResult } from '../../../shared/pagination';
import { Prisma } from '@prisma/client';
import { FeedService } from '../../feed/feed.service';
import { calculateTankuPriceWithFormula, PriceFormulaValue } from '../../../shared/utils/price-formula.utils';
import { PriceFormulaType } from '@prisma/client';

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  active?: boolean;
  lockedByAdmin?: boolean;
  inRanking?: boolean;
  sortBy?: 'default' | 'ranking';
}

export interface ProductPagination {
  page?: number;
  limit?: number;
}

export interface ProductWithVariants {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  images: string[];
  customImageUrls: string[]; // URLs de imágenes propias subidas a S3
  hiddenImages: string[];    // URLs bloqueadas (pueden ser Dropi o custom)
  categoryId: string | null;
  active: boolean;
  lockedByAdmin: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
  priceFormulaType: string | null;
  priceFormulaValue: any;
  createdAt: Date;
  updatedAt: Date;
  inRanking: boolean; // Indica si está en el ranking global (visible en frontend)
  rankingInfo: {
    globalScore: number;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  metrics: {
    wishlistCount: number;
    ordersCount: number;
    likesCount: number;
    commentsCount: number;
    updatedAt: Date;
  } | null;
  category: {
    id: string;
    name: string;
    handle: string;
  } | null;
  variants: Array<{
    id: string;
    sku: string;
    title: string;
    price: number;
    suggestedPrice: number | null;
    tankuPrice: number | null;
    stock: number; // Stock total calculado desde warehouseVariants
    active: boolean;
    warehouseVariants: Array<{
      id: string;
      warehouseId: number;
      warehouseName: string | null;
      warehouseCity: string | null;
      stock: number;
    }>;
  }>;
  locker: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface ProductListItem {
  id: string;
  title: string;
  handle: string;
  category: {
    id: string;
    name: string;
  } | null;
  price: number | null; // Precio base (mínimo de variantes)
  suggestedPrice: number | null; // Precio sugerido (mínimo de variantes)
  tankuPrice: number | null; // Precio Tanku (mínimo de variantes)
  stock: number; // Stock total (suma de warehouseVariants)
  hasVariants: boolean; // Si tiene variantes
  variantsCount: number; // Cantidad de variantes
  active: boolean;
  lockedByAdmin: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
  inRanking: boolean; // Indica si está en el ranking global (visible en frontend)
  createdAt: Date;
  updatedAt: Date;
}

export class AdminProductService {
  /**
   * Listar productos con filtros y paginación
   * Todos los admins ven todo en Fase 1 (sin permisos por categoría)
   */
  async getProducts(
    filters: ProductFilters = {},
    pagination: ProductPagination = {}
  ): Promise<{
    products: ProductListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const normalized = normalizePagination(pagination, { page: 1, limit: 50 });
    const { page, limit, skip } = normalized;

    // Construir where clause
    const where: Prisma.ProductWhereInput = {};

    // Filtro de búsqueda - Solo en título, insensible a tildes y mayúsculas/minúsculas
    if (filters.search) {
      // Normalizar el texto de búsqueda (quitar tildes y convertir a minúsculas)
      const normalizedSearch = filters.search
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
      
      // Buscar solo en título, usando modo insensible a mayúsculas
      // Prisma no tiene soporte nativo para búsqueda sin tildes, así que usamos contains
      // y normalizamos en la aplicación si es necesario
      where.title = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    // Filtro por categoría (puede ser 'null' para productos sin categoría)
    if (filters.categoryId !== undefined) {
      if (filters.categoryId === 'null' || filters.categoryId === null) {
        where.categoryId = null;
      } else if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }
    }

    // Filtro por estado activo - basado en variantes activas
    // Un producto está "activo" si tiene al menos una variante activa
    if (filters.active !== undefined) {
      if (filters.active) {
        // Productos con al menos una variante activa
        where.variants = {
          some: {
            active: true,
          },
        };
      } else {
        // Productos sin variantes activas (todas inactivas o sin variantes)
        // Usar AND para combinar con otros filtros
        const existingAND = Array.isArray(where.AND) ? where.AND : [];
        where.AND = [
          ...existingAND,
          {
            OR: [
              {
                variants: {
                  none: {},
                },
              },
              {
                variants: {
                  every: {
                    active: false,
                  },
                },
              },
            ],
          },
        ];
      }
    }

    // Filtro por bloqueo
    if (filters.lockedByAdmin !== undefined) {
      where.lockedByAdmin = filters.lockedByAdmin;
    }

    // Filtro por inRanking (visible en frontend)
    if (filters.inRanking !== undefined) {
      // Necesitamos hacer una subconsulta para verificar si está en ranking
      // Primero obtenemos los IDs de productos en ranking
      const rankingProducts = await (prisma as any).globalRanking.findMany({
        where: {
          itemType: 'product',
        },
        select: { itemId: true },
      });
      const rankingIds = Array.from(new Set(rankingProducts.map((r: any) => r.itemId as string))) as string[];
      
      // Usar AND para combinar con otros filtros sin sobrescribirlos
      const existingAND = Array.isArray(where.AND) ? where.AND : [];
      if (filters.inRanking) {
        // Solo productos que están en ranking
        where.AND = [
          ...existingAND,
          { id: { in: rankingIds } },
        ];
      } else {
        // Solo productos que NO están en ranking
        if (rankingIds.length > 0) {
          where.AND = [
            ...existingAND,
            { id: { notIn: rankingIds } },
          ];
        }
        // Si no hay productos en ranking, todos los productos cumplen (no agregar filtro)
      }
    }

    // Contar total usando Prisma (más simple para el count)
    const total = await prisma.product.count({ where });

    // Construir condiciones WHERE para SQL raw
    const whereConditions: string[] = [];
    const whereParams: any[] = [];
    let paramIndex = 1;

    // Filtro de búsqueda
    if (filters.search) {
      whereConditions.push(`LOWER(p.title) LIKE LOWER($${paramIndex})`);
      whereParams.push(`%${filters.search.trim()}%`);
      paramIndex++;
    }

    // Filtro por categoría
    if (filters.categoryId !== undefined) {
      if (filters.categoryId === 'null' || filters.categoryId === null) {
        whereConditions.push(`p."category_id" IS NULL`);
      } else if (filters.categoryId) {
        whereConditions.push(`p."category_id" = $${paramIndex}`);
        whereParams.push(filters.categoryId);
        paramIndex++;
      }
    }

    // Filtro por estado activo (basado en variantes)
    if (filters.active !== undefined) {
      if (filters.active) {
        whereConditions.push(`EXISTS (
          SELECT 1 FROM "product_variants" pv 
          WHERE pv."product_id" = p.id AND pv.active = true
        )`);
      } else {
        whereConditions.push(`NOT EXISTS (
          SELECT 1 FROM "product_variants" pv 
          WHERE pv."product_id" = p.id AND pv.active = true
        )`);
      }
    }

    // Filtro por bloqueo
    if (filters.lockedByAdmin !== undefined) {
      whereConditions.push(`p."locked_by_admin" = $${paramIndex}`);
      whereParams.push(filters.lockedByAdmin);
      paramIndex++;
    }

    // Filtro por inRanking
    if (filters.inRanking !== undefined) {
      if (filters.inRanking) {
        whereConditions.push(`EXISTS (
          SELECT 1 FROM "global_ranking" gr 
          WHERE gr."item_id" = p.id AND gr."item_type" = 'product'
        )`);
      } else {
        whereConditions.push(`NOT EXISTS (
          SELECT 1 FROM "global_ranking" gr 
          WHERE gr."item_id" = p.id AND gr."item_type" = 'product'
        )`);
      }
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Query SQL raw con ordenamiento
    // Si sortBy === 'ranking', ordenar por globalScore descendente, luego createdAt
    // Si sortBy === 'default', primero los que están en ranking, luego por createdAt desc
    let orderByClause = '';
    if (filters.sortBy === 'ranking') {
      // Ordenar por puntos (globalScore) descendente, luego createdAt
      orderByClause = `
      ORDER BY 
        COALESCE(gr."global_score", 0) DESC,
        p."created_at" DESC
      `;
    } else {
      // Ordenamiento por defecto: primero los que están en ranking, luego por createdAt desc
      orderByClause = `
      ORDER BY 
        CASE WHEN gr."item_id" IS NOT NULL THEN 0 ELSE 1 END ASC,
        p."created_at" DESC
      `;
    }

    const sqlQuery = `
      SELECT p.id
      FROM "products" p
      LEFT JOIN "global_ranking" gr ON gr."item_id" = p.id AND gr."item_type" = 'product'
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    whereParams.push(limit, skip);

    // Ejecutar query raw para obtener IDs ordenados
    const productsRaw = await prisma.$queryRawUnsafe<any[]>(sqlQuery, ...whereParams);
    const productIds = productsRaw.map((p: any) => p.id);

    // Si no hay productos, retornar vacío
    if (productIds.length === 0) {
      return {
        products: [],
        pagination: {
          page: normalized.page,
          limit: normalized.limit,
          total: total,
          totalPages: Math.ceil(total / normalized.limit),
        },
      };
    }

    // Obtener productos con todas sus relaciones usando Prisma normal
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        variants: {
          include: {
            warehouseVariants: {
              select: {
                stock: true,
              },
            },
          },
        },
        locker: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Mantener el orden de la query raw
    const productsMap = new Map(products.map(p => [p.id, p]));
    const sortedProducts = productIds.map(id => productsMap.get(id)).filter(Boolean) as typeof products;

    // Obtener IDs de productos en ranking para el mapeo
    const rankingItems = await (prisma as any).globalRanking.findMany({
      where: {
        itemId: { in: productIds },
        itemType: 'product',
      },
      select: { itemId: true },
    });
    const rankingIds = new Set(rankingItems.map((r: any) => r.itemId));

    // Mapear a formato de respuesta
    const mappedProducts: ProductListItem[] = sortedProducts.map((product) => {
      // Calcular precios mínimos y stock total
      const activeVariants = product.variants.filter((v) => v.active);
      const prices = activeVariants.map((v) => v.price);
      const suggestedPrices = activeVariants
        .map((v) => v.suggestedPrice)
        .filter((p): p is number => p !== null);
      const tankuPrices = activeVariants
        .map((v) => v.tankuPrice)
        .filter((p): p is number => p !== null);

      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const minSuggestedPrice = suggestedPrices.length > 0 ? Math.min(...suggestedPrices) : null;
      const minTankuPrice = tankuPrices.length > 0 ? Math.min(...tankuPrices) : null;
      
      // Calcular stock total sumando warehouseVariants (stocks reales)
      const totalStock = product.variants.reduce((sum, variant) => {
        const variantStock = variant.warehouseVariants?.reduce(
          (wvSum, wv) => wvSum + (wv.stock || 0),
          0
        ) || 0;
        return sum + variantStock;
      }, 0);

      // Determinar si el producto está "activo" basado en variantes
      // Un producto está activo si tiene al menos una variante activa
      const hasActiveVariants = activeVariants.length > 0;

      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        category: product.category
          ? {
              id: product.category.id,
              name: product.category.name,
            }
          : null,
        price: minPrice,
        suggestedPrice: minSuggestedPrice,
        tankuPrice: minTankuPrice,
        stock: totalStock,
        hasVariants: product.variants.length > 0,
        variantsCount: product.variants.length,
        active: hasActiveVariants, // Basado en variantes activas, no en product.active
        lockedByAdmin: product.lockedByAdmin,
        lockedAt: product.lockedAt,
        lockedBy: product.lockedBy,
        inRanking: (() => {
          // Verificar si está en ranking Y cumple requisitos
          const isInRanking = rankingIds.has(product.id);
          if (!isInRanking) return false;
          
          // Validar requisitos
          const MIN_STOCK_THRESHOLD = 30;
          const hasValidTitle = product.title && 
                               product.title.trim() !== '' && 
                               product.title !== 'Sin nombre';
          const hasValidImages = product.images && 
                                Array.isArray(product.images) && 
                                product.images.length > 0;
          const meetsRequirements = totalStock >= MIN_STOCK_THRESHOLD && 
                                   hasValidTitle && 
                                   hasValidImages && 
                                   hasActiveVariants;
          
          // Si está en ranking pero no cumple, eliminarlo
          if (!meetsRequirements) {
            // Eliminar del ranking (async, no bloquea la respuesta)
            (prisma as any).globalRanking.deleteMany({
              where: {
                itemId: product.id,
                itemType: 'product',
              },
            }).catch((error: any) => {
              console.warn(`[ADMIN PRODUCTS] Error eliminando producto ${product.id} del ranking:`, error?.message);
            });
            return false;
          }
          
          return true;
        })(),
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    // Calcular paginación manualmente (createPaginatedResult espera items primero)
    const totalPages = Math.ceil(total / limit);
    
    return {
      products: mappedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Obtener producto por ID con todas sus variantes
   */
  async getProductById(id: string): Promise<ProductWithVariants> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            handle: true,
          },
        },
        variants: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            warehouseVariants: {
              select: {
                id: true,
                warehouseId: true,
                warehouseName: true,
                warehouseCity: true,
                stock: true,
              },
            },
          },
        },
        locker: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Calcular stock total para validación
    const MIN_STOCK_THRESHOLD = 30;
    const totalStock = product.variants.reduce((total, variant) => {
      const variantStock = variant.warehouseVariants?.reduce(
        (sum, wv) => sum + (wv.stock || 0),
        0
      ) || 0;
      return total + variantStock;
    }, 0);

    const hasValidTitle = product.title && 
                         product.title.trim() !== '' && 
                         product.title !== 'Sin nombre';
    const hasValidImages = product.images && 
                          Array.isArray(product.images) && 
                          product.images.length > 0;
    const meetsRequirements = totalStock >= MIN_STOCK_THRESHOLD && 
                             hasValidTitle && 
                             hasValidImages && 
                             product.active;

    // Verificar si está en el ranking global
    const rankingEntry = await (prisma as any).globalRanking.findUnique({
      where: {
        itemId_itemType: {
          itemId: product.id,
          itemType: 'product',
        },
      },
    });

    // Obtener métricas del producto
    const metrics = await (prisma as any).itemMetric.findUnique({
      where: {
        itemId_itemType: {
          itemId: product.id,
          itemType: 'product',
        },
      },
    });

    // Si está en el ranking pero no cumple requisitos, eliminarlo
    if (rankingEntry && !meetsRequirements) {
      try {
        await (prisma as any).globalRanking.deleteMany({
          where: {
            itemId: product.id,
            itemType: 'product',
          },
        });
        console.log(`[ADMIN PRODUCTS] Producto ${product.id} eliminado del ranking (no cumple requisitos: stock=${totalStock}, title=${hasValidTitle}, images=${hasValidImages}, active=${product.active})`);
      } catch (error: any) {
        console.warn(`[ADMIN PRODUCTS] Error eliminando producto del ranking:`, error?.message);
      }
    }

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description,
      images: product.images,
      customImageUrls: product.customImageUrls || [],
      hiddenImages: product.hiddenImages || [],
      categoryId: product.categoryId,
      active: product.active,
      lockedByAdmin: product.lockedByAdmin,
      lockedAt: product.lockedAt,
      lockedBy: product.lockedBy,
      priceFormulaType: product.priceFormulaType,
      priceFormulaValue: product.priceFormulaValue,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      inRanking: meetsRequirements && !!rankingEntry ? true : false, // Indica si está en el ranking global Y cumple requisitos
      rankingInfo: rankingEntry ? {
        globalScore: rankingEntry.globalScore,
        createdAt: rankingEntry.createdAt,
        updatedAt: rankingEntry.updatedAt,
      } : null,
      metrics: metrics ? {
        wishlistCount: metrics.wishlistCount,
        ordersCount: metrics.ordersCount,
        likesCount: metrics.likesCount,
        commentsCount: metrics.commentsCount,
        updatedAt: metrics.updatedAt,
      } : null,
      category: product.category,
      variants: product.variants.map((v) => {
        // Calcular stock real desde warehouseVariants
        const variantStock = v.warehouseVariants?.reduce(
          (sum, wv) => sum + (wv.stock || 0),
          0
        ) || 0;

        return {
          id: v.id,
          sku: v.sku,
          title: v.title,
          price: v.price,
          suggestedPrice: v.suggestedPrice,
          tankuPrice: v.tankuPrice,
          stock: variantStock,
          active: v.active,
          warehouseVariants: v.warehouseVariants?.map((wv) => ({
            id: wv.id,
            warehouseId: wv.warehouseId,
            warehouseName: wv.warehouseName,
            warehouseCity: wv.warehouseCity,
            stock: wv.stock,
          })) || [],
        };
      }),
      locker: product.locker,
    };
  }

  /**
   * Cambiar estado activo/inactivo de un producto
   * Si está bloqueado, los workers no lo cambiarán
   * 
   * Lógica:
   * - Si desactivo: desactiva TODAS las variantes y elimina del ranking global
   * - Si activo: activa SOLO las variantes con stock > 0 y agrega al ranking si cumple requisitos
   */
  async toggleProductActive(id: string, active: boolean, adminUserId: string): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: {
            warehouseVariants: {
              select: { stock: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Calcular stock total del producto
    const totalStock = product.variants.reduce((total, variant) => {
      const variantStock = variant.warehouseVariants?.reduce(
        (sum, wv) => sum + (wv.stock || 0),
        0
      ) || 0;
      return total + variantStock;
    }, 0);

    // Calcular stock por variante
    const variantStocks = product.variants.map((variant) => {
      const totalStock = variant.warehouseVariants?.reduce(
        (sum, wv) => sum + (wv.stock || 0),
        0
      ) || 0;
      return {
        variantId: variant.id,
        stock: totalStock,
      };
    });

    // Validar requisitos para ranking
    const MIN_STOCK_THRESHOLD = 30; // Mismo umbral que usa dropi-sync
    const hasValidTitle = product.title && 
                         product.title.trim() !== '' && 
                         product.title !== 'Sin nombre';
    const hasValidImages = product.images && 
                          Array.isArray(product.images) && 
                          product.images.length > 0;
    const meetsRankingRequirements = totalStock >= MIN_STOCK_THRESHOLD && 
                                     hasValidTitle && 
                                     hasValidImages;

    // Actualizar estado del producto y bloquear automáticamente
    await prisma.product.update({
      where: { id },
      data: {
        active,
        lockedByAdmin: true, // Bloquear al cambiar estado manualmente
        lockedAt: new Date(),
        lockedBy: adminUserId,
      },
    });

    // Actualizar estado de las variantes según la lógica
    if (active) {
      // ACTIVAR: Solo activar variantes con stock >= 30 (mismo umbral que ranking)
      const variantsToActivate = variantStocks
        .filter((vs) => vs.stock >= MIN_STOCK_THRESHOLD)
        .map((vs) => vs.variantId);

      const variantsToDeactivate = variantStocks
        .filter((vs) => vs.stock < MIN_STOCK_THRESHOLD)
        .map((vs) => vs.variantId);

      // Activar variantes con stock
      if (variantsToActivate.length > 0) {
        await prisma.productVariant.updateMany({
          where: {
            id: { in: variantsToActivate },
          },
          data: {
            active: true,
          },
        });
        console.log(`[ADMIN PRODUCTS] ${variantsToActivate.length} variantes activadas (con stock)`);
      }

      // Asegurar que variantes sin stock estén desactivadas
      if (variantsToDeactivate.length > 0) {
        await prisma.productVariant.updateMany({
          where: {
            id: { in: variantsToDeactivate },
          },
          data: {
            active: false,
          },
        });
        console.log(`[ADMIN PRODUCTS] ${variantsToDeactivate.length} variantes desactivadas (sin stock)`);
      }

      // Agregar al ranking global solo si cumple requisitos
      if (meetsRankingRequirements) {
        try {
          const feedService = new FeedService();
          await feedService.initializeItemMetrics(id, 'product');
          // Recalcular el ranking basado en las métricas actuales
          await feedService.recalculateRankingForItem(id, 'product');
          console.log(`[ADMIN PRODUCTS] Producto agregado al ranking global y score recalculado`);
        } catch (error: any) {
          console.error(`[ADMIN PRODUCTS] Error agregando producto al ranking:`, error?.message);
        }
      } else {
        // Eliminar del ranking si no cumple requisitos
        try {
          await (prisma as any).globalRanking.deleteMany({
            where: {
              itemId: id,
              itemType: 'product',
            },
          });
          console.log(`[ADMIN PRODUCTS] Producto eliminado del ranking (no cumple requisitos: stock=${totalStock}, title=${hasValidTitle}, images=${hasValidImages})`);
        } catch (error: any) {
          console.warn(`[ADMIN PRODUCTS] Error eliminando producto del ranking:`, error?.message);
        }
      }
    } else {
      // DESACTIVAR: Desactivar TODAS las variantes y eliminar del ranking
      await prisma.productVariant.updateMany({
        where: {
          productId: id,
        },
        data: {
          active: false,
        },
      });
      console.log(`[ADMIN PRODUCTS] ${product.variants.length} variantes desactivadas`);

      // Eliminar del ranking global
      try {
        await (prisma as any).globalRanking.deleteMany({
          where: {
            itemId: id,
            itemType: 'product',
          },
        });
        console.log(`[ADMIN PRODUCTS] Producto eliminado del ranking global`);
      } catch (error: any) {
        console.warn(`[ADMIN PRODUCTS] Error eliminando producto del ranking:`, error?.message);
      }
    }

    console.log(`[ADMIN PRODUCTS] Producto ${id} marcado como ${active ? 'activo' : 'inactivo'} por admin ${adminUserId}`);
  }

  /**
   * Actualizar producto (título, descripción, categoría)
   * Bloquea automáticamente el producto al editar
   */
  async updateProduct(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      categoryId?: string | null;
    },
    adminUserId: string
  ): Promise<ProductWithVariants> {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (data.title !== undefined) {
      if (!data.title || data.title.trim() === '') {
        throw new BadRequestError('El título no puede estar vacío');
      }
      updateData.title = data.title.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.categoryId !== undefined) {
      // Si categoryId es 'null' o null, establecer como null
      updateData.categoryId = data.categoryId === 'null' || data.categoryId === null ? null : data.categoryId;
      
      // Validar que la categoría existe si se proporciona
      if (updateData.categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: updateData.categoryId },
        });
        if (!category) {
          throw new NotFoundError('Categoría no encontrada');
        }
      }
    }

    // Actualizar producto y bloquear automáticamente
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...updateData,
        lockedByAdmin: true, // Bloquear automáticamente al editar
        lockedAt: new Date(),
        lockedBy: adminUserId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            handle: true,
          },
        },
        variants: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            warehouseVariants: {
              select: {
                id: true,
                warehouseId: true,
                warehouseName: true,
                warehouseCity: true,
                stock: true,
              },
            },
          },
        },
        locker: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Verificar si está en ranking y cumple requisitos
    const MIN_STOCK_THRESHOLD = 30;
    const totalStock = updatedProduct.variants.reduce((total, variant) => {
      const variantStock = variant.warehouseVariants?.reduce(
        (sum, wv) => sum + (wv.stock || 0),
        0
      ) || 0;
      return total + variantStock;
    }, 0);

    const hasValidTitle = updatedProduct.title && 
                         updatedProduct.title.trim() !== '' && 
                         updatedProduct.title !== 'Sin nombre';
    const hasValidImages = updatedProduct.images && 
                          Array.isArray(updatedProduct.images) && 
                          updatedProduct.images.length > 0;
    const meetsRequirements = totalStock >= MIN_STOCK_THRESHOLD && 
                             hasValidTitle && 
                             hasValidImages && 
                             updatedProduct.active;

    const rankingEntry = await (prisma as any).globalRanking.findUnique({
      where: {
        itemId_itemType: {
          itemId: updatedProduct.id,
          itemType: 'product',
        },
      },
    });

    // Si está en ranking pero no cumple requisitos, eliminarlo
    if (rankingEntry && !meetsRequirements) {
      try {
        await (prisma as any).globalRanking.deleteMany({
          where: {
            itemId: updatedProduct.id,
            itemType: 'product',
          },
        });
        console.log(`[ADMIN PRODUCTS] Producto ${updatedProduct.id} eliminado del ranking después de edición (no cumple requisitos)`);
      } catch (error: any) {
        console.warn(`[ADMIN PRODUCTS] Error eliminando producto del ranking:`, error?.message);
      }
    }

    console.log(`[ADMIN PRODUCTS] Producto ${id} actualizado y bloqueado por admin ${adminUserId}`);

    // Retornar en formato ProductWithVariants
    return {
      id: updatedProduct.id,
      title: updatedProduct.title,
      handle: updatedProduct.handle,
      description: updatedProduct.description,
      images: updatedProduct.images,
      customImageUrls: updatedProduct.customImageUrls || [],
      hiddenImages: updatedProduct.hiddenImages || [],
      categoryId: updatedProduct.categoryId,
      active: updatedProduct.active,
      lockedByAdmin: updatedProduct.lockedByAdmin,
      lockedAt: updatedProduct.lockedAt,
      lockedBy: updatedProduct.lockedBy,
      priceFormulaType: updatedProduct.priceFormulaType,
      priceFormulaValue: updatedProduct.priceFormulaValue,
      createdAt: updatedProduct.createdAt,
      updatedAt: updatedProduct.updatedAt,
      inRanking: !!(meetsRequirements && rankingEntry),
      rankingInfo: null,
      metrics: null,
      category: updatedProduct.category,
      variants: updatedProduct.variants.map((v) => {
        const variantStock = v.warehouseVariants?.reduce(
          (sum, wv) => sum + (wv.stock || 0),
          0
        ) || 0;

        return {
          id: v.id,
          sku: v.sku,
          title: v.title,
          price: v.price,
          suggestedPrice: v.suggestedPrice,
          tankuPrice: v.tankuPrice,
          stock: variantStock,
          active: v.active,
          warehouseVariants: v.warehouseVariants?.map((wv) => ({
            id: wv.id,
            warehouseId: wv.warehouseId,
            warehouseName: wv.warehouseName,
            warehouseCity: wv.warehouseCity,
            stock: wv.stock,
          })) || [],
        };
      }),
      locker: updatedProduct.locker,
    };
  }

  /**
   * Actualizar título de una variante
   * Bloquea automáticamente el producto al editar
   */
  async updateVariantTitle(
    variantId: string,
    title: string,
    adminUserId: string
  ): Promise<void> {
    // Obtener la variante para acceder al producto
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundError('Variante no encontrada');
    }

    if (!title || title.trim() === '') {
      throw new BadRequestError('El título de la variante no puede estar vacío');
    }

    // Actualizar título de la variante
    await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        title: title.trim(),
      },
    });

    // Bloquear automáticamente el producto al editar variante
    await prisma.product.update({
      where: { id: variant.product.id },
      data: {
        lockedByAdmin: true,
        lockedAt: new Date(),
        lockedBy: adminUserId,
      },
    });

    console.log(`[ADMIN PRODUCTS] Variante ${variantId} actualizada y producto ${variant.product.id} bloqueado por admin ${adminUserId}`);
  }

  /**
   * Reordenar imágenes: mover una imagen a la primera posición (imagen principal)
   * Bloquea automáticamente el producto al reordenar
   */
  async reorderImages(
    id: string,
    imageIndex: number,
    adminUserId: string
  ): Promise<ProductWithVariants> {
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        images: true,
      },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
      throw new BadRequestError('El producto no tiene imágenes');
    }

    if (imageIndex < 0 || imageIndex >= product.images.length) {
      throw new BadRequestError('Índice de imagen inválido');
    }

    // Si ya es la primera imagen, no hacer nada
    if (imageIndex === 0) {
      // Aún así, recargar el producto completo para retornar
      return await this.getProductById(id);
    }

    // Reordenar: mover la imagen seleccionada al inicio
    const newImages = [
      product.images[imageIndex], // Imagen seleccionada primero
      ...product.images.slice(0, imageIndex), // Imágenes antes de la seleccionada
      ...product.images.slice(imageIndex + 1), // Imágenes después de la seleccionada
    ];

    // Actualizar producto y bloquear automáticamente
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        images: newImages,
        lockedByAdmin: true, // Bloquear automáticamente al reordenar
        lockedAt: new Date(),
        lockedBy: adminUserId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            handle: true,
          },
        },
        variants: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            warehouseVariants: {
              select: {
                id: true,
                warehouseId: true,
                warehouseName: true,
                warehouseCity: true,
                stock: true,
              },
            },
          },
        },
        locker: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(`[ADMIN PRODUCTS] Imágenes reordenadas para producto ${id} por admin ${adminUserId}`);

    // Retornar en formato ProductWithVariants
    const MIN_STOCK_THRESHOLD = 30;
    const totalStock = updatedProduct.variants.reduce((total, variant) => {
      const variantStock = variant.warehouseVariants?.reduce(
        (sum, wv) => sum + (wv.stock || 0),
        0
      ) || 0;
      return total + variantStock;
    }, 0);

    const hasValidTitle = updatedProduct.title && 
                         updatedProduct.title.trim() !== '' && 
                         updatedProduct.title !== 'Sin nombre';
    const hasValidImages = updatedProduct.images && 
                          Array.isArray(updatedProduct.images) && 
                          updatedProduct.images.length > 0;
    const meetsRequirements = totalStock >= MIN_STOCK_THRESHOLD && 
                             hasValidTitle && 
                             hasValidImages && 
                             updatedProduct.active;

    const rankingEntry = await (prisma as any).globalRanking.findUnique({
      where: {
        itemId_itemType: {
          itemId: updatedProduct.id,
          itemType: 'product',
        },
      },
    });

    return {
      id: updatedProduct.id,
      title: updatedProduct.title,
      handle: updatedProduct.handle,
      description: updatedProduct.description,
      images: updatedProduct.images,
      customImageUrls: updatedProduct.customImageUrls || [],
      hiddenImages: updatedProduct.hiddenImages || [],
      categoryId: updatedProduct.categoryId,
      active: updatedProduct.active,
      lockedByAdmin: updatedProduct.lockedByAdmin,
      lockedAt: updatedProduct.lockedAt,
      lockedBy: updatedProduct.lockedBy,
      priceFormulaType: updatedProduct.priceFormulaType,
      priceFormulaValue: updatedProduct.priceFormulaValue,
      createdAt: updatedProduct.createdAt,
      updatedAt: updatedProduct.updatedAt,
      inRanking: !!(meetsRequirements && rankingEntry),
      rankingInfo: null,
      metrics: null,
      category: updatedProduct.category,
      variants: updatedProduct.variants.map((v) => {
        const variantStock = v.warehouseVariants?.reduce(
          (sum, wv) => sum + (wv.stock || 0),
          0
        ) || 0;

        return {
          id: v.id,
          sku: v.sku,
          title: v.title,
          price: v.price,
          suggestedPrice: v.suggestedPrice,
          tankuPrice: v.tankuPrice,
          stock: variantStock,
          active: v.active,
          warehouseVariants: v.warehouseVariants?.map((wv) => ({
            id: wv.id,
            warehouseId: wv.warehouseId,
            warehouseName: wv.warehouseName,
            warehouseCity: wv.warehouseCity,
            stock: wv.stock,
          })) || [],
        };
      }),
      locker: updatedProduct.locker,
    };
  }

  /**
   * Agregar imagen propia (subida a S3)
   * Bloquea automáticamente el producto
   */
  async addImage(
    productId: string,
    imageUrl: string,
    adminUserId: string
  ): Promise<ProductWithVariants> {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Agregar a images y a customImageUrls
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        images: { push: imageUrl },
        customImageUrls: { push: imageUrl },
        lockedByAdmin: true,
        lockedAt: new Date(),
        lockedBy: adminUserId,
      },
      include: {
        category: { select: { id: true, name: true, handle: true } },
        variants: {
          include: {
            warehouseVariants: {
              select: {
                id: true,
                warehouseId: true,
                warehouseName: true,
                warehouseCity: true,
                stock: true,
              },
            },
          },
        },
        locker: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    // Validar y actualizar ranking si es necesario
    const feedService = new FeedService();
    const totalStock = updatedProduct.variants.reduce((total, variant) => {
      const variantStock = variant.warehouseVariants?.reduce(
        (sum, wv) => sum + (wv.stock || 0),
        0
      ) || 0;
      return total + variantStock;
    }, 0);

    const MIN_STOCK_THRESHOLD = 30;
    const hasValidTitle = updatedProduct.title && 
                         updatedProduct.title.trim() !== '' && 
                         updatedProduct.title !== 'Sin nombre';
    const hasValidImages = updatedProduct.images && 
                          Array.isArray(updatedProduct.images) && 
                          updatedProduct.images.length > 0;
    const meetsRequirements = totalStock >= MIN_STOCK_THRESHOLD && 
                             hasValidTitle && 
                             hasValidImages && 
                             updatedProduct.active;

    const rankingEntry = await (prisma as any).globalRanking.findUnique({
      where: {
        itemId_itemType: {
          itemId: updatedProduct.id,
          itemType: 'product',
        },
      },
    });

    console.log(`[ADMIN PRODUCTS] Imagen agregada al producto ${productId} por admin ${adminUserId}`);

    return {
      id: updatedProduct.id,
      title: updatedProduct.title,
      handle: updatedProduct.handle,
      description: updatedProduct.description,
      images: updatedProduct.images,
      customImageUrls: updatedProduct.customImageUrls || [],
      hiddenImages: updatedProduct.hiddenImages || [],
      categoryId: updatedProduct.categoryId,
      active: updatedProduct.active,
      lockedByAdmin: updatedProduct.lockedByAdmin,
      lockedAt: updatedProduct.lockedAt,
      lockedBy: updatedProduct.lockedBy,
      priceFormulaType: updatedProduct.priceFormulaType,
      priceFormulaValue: updatedProduct.priceFormulaValue,
      createdAt: updatedProduct.createdAt,
      updatedAt: updatedProduct.updatedAt,
      inRanking: !!(meetsRequirements && rankingEntry),
      rankingInfo: null,
      metrics: null,
      category: updatedProduct.category,
      variants: updatedProduct.variants.map((v) => {
        const variantStock = v.warehouseVariants?.reduce(
          (sum, wv) => sum + (wv.stock || 0),
          0
        ) || 0;

        return {
          id: v.id,
          sku: v.sku,
          title: v.title,
          price: v.price,
          suggestedPrice: v.suggestedPrice,
          tankuPrice: v.tankuPrice,
          stock: variantStock,
          active: v.active,
          warehouseVariants: v.warehouseVariants?.map((wv) => ({
            id: wv.id,
            warehouseId: wv.warehouseId,
            warehouseName: wv.warehouseName,
            warehouseCity: wv.warehouseCity,
            stock: wv.stock,
          })) || [],
        };
      }),
      locker: updatedProduct.locker,
    };
  }

  /**
   * Eliminar imagen propia (elimina de S3 y del array)
   * Solo se pueden eliminar imágenes propias (customImageUrls)
   */
  async deleteCustomImage(
    productId: string,
    imageUrl: string,
    adminUserId: string
  ): Promise<ProductWithVariants> {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Verificar que es una imagen propia
    if (!product.customImageUrls || !product.customImageUrls.includes(imageUrl)) {
      throw new BadRequestError('Esta imagen no es propia y no se puede eliminar');
    }

    // Eliminar de S3
    const { S3Service } = await import('../../../shared/services/s3.service');
    const s3Service = new S3Service();
    try {
      await s3Service.deleteFile(imageUrl);
      console.log(`[ADMIN PRODUCTS] Imagen ${imageUrl} eliminada de S3`);
    } catch (error) {
      console.error(`[ADMIN PRODUCTS] Error eliminando imagen de S3:`, error);
      // Lanzar error para que el usuario sepa que falló
      throw new BadRequestError(`Error al eliminar imagen de S3: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    // Remover de arrays
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        images: { set: product.images.filter(img => img !== imageUrl) },
        customImageUrls: { set: product.customImageUrls.filter(img => img !== imageUrl) },
        hiddenImages: { set: (product.hiddenImages || []).filter(img => img !== imageUrl) },
        lockedByAdmin: true,
        lockedAt: new Date(),
        lockedBy: adminUserId,
      },
      include: {
        category: { select: { id: true, name: true, handle: true } },
        variants: {
          include: {
            warehouseVariants: {
              select: {
                id: true,
                warehouseId: true,
                warehouseName: true,
                warehouseCity: true,
                stock: true,
              },
            },
          },
        },
        locker: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    // Validar y actualizar ranking si es necesario
    const feedService = new FeedService();
    const totalStock = updatedProduct.variants.reduce((total, variant) => {
      const variantStock = variant.warehouseVariants?.reduce(
        (sum, wv) => sum + (wv.stock || 0),
        0
      ) || 0;
      return total + variantStock;
    }, 0);

    const MIN_STOCK_THRESHOLD = 30;
    const hasValidTitle = updatedProduct.title && 
                         updatedProduct.title.trim() !== '' && 
                         updatedProduct.title !== 'Sin nombre';
    const hasValidImages = updatedProduct.images && 
                          Array.isArray(updatedProduct.images) && 
                          updatedProduct.images.length > 0;
    const meetsRequirements = totalStock >= MIN_STOCK_THRESHOLD && 
                             hasValidTitle && 
                             hasValidImages && 
                             updatedProduct.active;

    const rankingEntry = await (prisma as any).globalRanking.findUnique({
      where: {
        itemId_itemType: {
          itemId: updatedProduct.id,
          itemType: 'product',
        },
      },
    });

    console.log(`[ADMIN PRODUCTS] Imagen propia eliminada del producto ${productId} por admin ${adminUserId}`);

    return {
      id: updatedProduct.id,
      title: updatedProduct.title,
      handle: updatedProduct.handle,
      description: updatedProduct.description,
      images: updatedProduct.images,
      customImageUrls: updatedProduct.customImageUrls || [],
      hiddenImages: updatedProduct.hiddenImages || [],
      categoryId: updatedProduct.categoryId,
      active: updatedProduct.active,
      lockedByAdmin: updatedProduct.lockedByAdmin,
      lockedAt: updatedProduct.lockedAt,
      lockedBy: updatedProduct.lockedBy,
      priceFormulaType: updatedProduct.priceFormulaType,
      priceFormulaValue: updatedProduct.priceFormulaValue,
      createdAt: updatedProduct.createdAt,
      updatedAt: updatedProduct.updatedAt,
      inRanking: !!(meetsRequirements && rankingEntry),
      rankingInfo: null,
      metrics: null,
      category: updatedProduct.category,
      variants: updatedProduct.variants.map((v) => {
        const variantStock = v.warehouseVariants?.reduce(
          (sum, wv) => sum + (wv.stock || 0),
          0
        ) || 0;

        return {
          id: v.id,
          sku: v.sku,
          title: v.title,
          price: v.price,
          suggestedPrice: v.suggestedPrice,
          tankuPrice: v.tankuPrice,
          stock: variantStock,
          active: v.active,
          warehouseVariants: v.warehouseVariants?.map((wv) => ({
            id: wv.id,
            warehouseId: wv.warehouseId,
            warehouseName: wv.warehouseName,
            warehouseCity: wv.warehouseCity,
            stock: wv.stock,
          })) || [],
        };
      }),
      locker: updatedProduct.locker,
    };
  }

  /**
   * Bloquear imagen (Dropi o custom)
   * Agrega la URL a hiddenImages
   */
  async hideImage(
    productId: string,
    imageUrl: string,
    adminUserId: string
  ): Promise<ProductWithVariants> {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    if (!product.images || !product.images.includes(imageUrl)) {
      throw new BadRequestError('Imagen no encontrada en el producto');
    }

    // Agregar a hiddenImages si no está
    const currentHiddenImages = product.hiddenImages || [];
    const updatedHiddenImages = currentHiddenImages.includes(imageUrl)
      ? currentHiddenImages
      : [...currentHiddenImages, imageUrl];

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        hiddenImages: { set: updatedHiddenImages },
        lockedByAdmin: true,
        lockedAt: new Date(),
        lockedBy: adminUserId,
      },
      include: {
        category: { select: { id: true, name: true, handle: true } },
        variants: {
          include: {
            warehouseVariants: { select: { stock: true } },
          },
        },
        locker: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    console.log(`[ADMIN PRODUCTS] Imagen bloqueada en producto ${productId} por admin ${adminUserId}`);

    return this.getProductById(productId);
  }

  /**
   * Desbloquear imagen
   * Remueve la URL de hiddenImages
   */
  async showImage(
    productId: string,
    imageUrl: string,
    adminUserId: string
  ): Promise<ProductWithVariants> {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Remover de hiddenImages
    const currentHiddenImages = product.hiddenImages || [];
    const updatedHiddenImages = currentHiddenImages.filter(img => img !== imageUrl);

    await prisma.product.update({
      where: { id: productId },
      data: {
        hiddenImages: { set: updatedHiddenImages },
        lockedByAdmin: true,
        lockedAt: new Date(),
        lockedBy: adminUserId,
      },
    });

    console.log(`[ADMIN PRODUCTS] Imagen desbloqueada en producto ${productId} por admin ${adminUserId}`);

    return this.getProductById(productId);
  }

  /**
   * Aplicar fórmula de precio a un producto
   * Recalcula todos los tankuPrice de las variantes y bloquea el producto
   */
  async applyPriceFormula(
    productId: string,
    formulaId: string,
    adminUserId: string
  ): Promise<ProductWithVariants> {
    // Obtener producto con variantes
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          include: {
            warehouseVariants: {
              select: {
                id: true,
                warehouseId: true,
                warehouseName: true,
                warehouseCity: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Obtener fórmula
    const formula = await prisma.priceFormula.findUnique({
      where: { id: formulaId },
    });

    if (!formula) {
      throw new NotFoundError('Fórmula de precio no encontrada');
    }

    // Recalcular tankuPrice para todas las variantes
    // IMPORTANTE: Las fórmulas se calculan SOLO desde suggestedPrice (no desde price)
    const variantUpdates = await Promise.all(
      product.variants.map(async (variant) => {
        // Usar SOLO suggestedPrice (no price como fallback)
        const basePrice = variant.suggestedPrice;
        if (!basePrice || basePrice <= 0) {
          console.warn(`[ADMIN PRODUCTS] Variante ${variant.sku} no tiene suggestedPrice, saltando...`);
          return variant; // Retornar variante sin cambios si no tiene suggestedPrice
        }
        
        const newTankuPrice = calculateTankuPriceWithFormula(
          basePrice,
          formula.type,
          formula.value as PriceFormulaValue
        );

        return prisma.productVariant.update({
          where: { id: variant.id },
          data: { tankuPrice: newTankuPrice },
        });
      })
    );

    // Actualizar producto con la fórmula y bloquear
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        priceFormulaType: formula.type,
        priceFormulaValue: formula.value as any, // Prisma JSON type
        lockedByAdmin: true,
        lockedAt: new Date(),
        lockedBy: adminUserId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            handle: true,
          },
        },
        variants: {
          include: {
            warehouseVariants: {
              select: {
                id: true,
                warehouseId: true,
                warehouseName: true,
                warehouseCity: true,
                stock: true,
              },
            },
          },
        },
        locker: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(`[ADMIN PRODUCTS] Fórmula "${formula.name}" aplicada a producto ${productId} por admin ${adminUserId}`);

    return this.getProductById(productId);
  }

  /**
   * Actualizar categoría de múltiples productos en masa
   */
  async bulkUpdateCategory(
    productIds: string[],
    categoryId: string | null,
    adminUserId: string
  ): Promise<{
    updated: number;
    errors: number;
    details: Array<{ productId: string; success: boolean; error?: string }>;
  }> {
    if (!productIds || productIds.length === 0) {
      throw new BadRequestError('Debe proporcionar al menos un ID de producto');
    }

    // Validar categoría si se proporciona
    if (categoryId !== null) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundError(`Categoría con ID ${categoryId} no encontrada`);
      }
    }

    const details: Array<{ productId: string; success: boolean; error?: string }> = [];
    let updated = 0;
    let errors = 0;

    // Procesar en batches de 50
    const batchSize = 50;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);

      for (const productId of batch) {
        try {
          await prisma.product.update({
            where: { id: productId },
            data: {
              categoryId,
              lockedByAdmin: true,
              lockedAt: new Date(),
              lockedBy: adminUserId,
            },
          });
          updated++;
          details.push({ productId, success: true });
        } catch (error: any) {
          errors++;
          details.push({
            productId,
            success: false,
            error: error?.message || 'Error desconocido',
          });
        }
      }
    }

    console.log(`[ADMIN PRODUCTS] Categoría actualizada en masa: ${updated} actualizados, ${errors} errores`);

    return { updated, errors, details };
  }

  /**
   * Aplicar fórmula de precio a múltiples productos en masa
   */
  async bulkApplyPriceFormula(
    productIds: string[],
    formulaId: string,
    adminUserId: string
  ): Promise<{
    updated: number;
    errors: number;
    details: Array<{ productId: string; success: boolean; error?: string }>;
  }> {
    if (!productIds || productIds.length === 0) {
      throw new BadRequestError('Debe proporcionar al menos un ID de producto');
    }

    // Obtener fórmula
    const formula = await prisma.priceFormula.findUnique({
      where: { id: formulaId },
    });

    if (!formula) {
      throw new NotFoundError(`Fórmula con ID ${formulaId} no encontrada`);
    }

    const details: Array<{ productId: string; success: boolean; error?: string }> = [];
    let updated = 0;
    let errors = 0;

    // Procesar en batches de 50
    const batchSize = 50;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);

      for (const productId of batch) {
        try {
          // Obtener producto con variantes
          const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
              variants: true,
            },
          });

          if (!product) {
            errors++;
            details.push({
              productId,
              success: false,
              error: `Producto con ID ${productId} no encontrado`,
            });
            continue;
          }

          // Actualizar fórmula del producto
          await prisma.product.update({
            where: { id: productId },
            data: {
              priceFormulaType: formula.type,
              priceFormulaValue: formula.value as any,
              lockedByAdmin: true,
              lockedAt: new Date(),
              lockedBy: adminUserId,
            },
          });

          // Recalcular tankuPrice de todas las variantes
          // IMPORTANTE: Las fórmulas se calculan SOLO desde suggestedPrice (no desde price)
          for (const variant of product.variants) {
            // Usar SOLO suggestedPrice (no price como fallback)
            const basePrice = variant.suggestedPrice;
            if (!basePrice || basePrice <= 0) {
              console.warn(`[ADMIN PRODUCTS] Variante ${variant.sku} no tiene suggestedPrice, saltando...`);
              continue; // Saltar variante si no tiene suggestedPrice
            }
            
            const tankuPrice = calculateTankuPriceWithFormula(
              basePrice,
              formula.type,
              formula.value as PriceFormulaValue
            );

            await prisma.productVariant.update({
              where: { id: variant.id },
              data: { tankuPrice },
            });
          }

          updated++;
          details.push({ productId, success: true });
        } catch (error: any) {
          errors++;
          details.push({
            productId,
            success: false,
            error: error?.message || 'Error desconocido',
          });
        }
      }
    }

    console.log(`[ADMIN PRODUCTS] Fórmula aplicada en masa: ${updated} actualizados, ${errors} errores`);

    return { updated, errors, details };
  }

  /**
   * Cambiar estado activo/inactivo de múltiples productos en masa
   */
  async bulkToggleActive(
    productIds: string[],
    active: boolean,
    adminUserId: string
  ): Promise<{
    updated: number;
    errors: number;
    rankingUpdated: number;
    details: Array<{
      productId: string;
      success: boolean;
      error?: string;
      inRanking?: boolean;
      reason?: string;
    }>;
  }> {
    if (!productIds || productIds.length === 0) {
      throw new BadRequestError('Debe proporcionar al menos un ID de producto');
    }

    const MIN_STOCK_THRESHOLD = 30;
    const feedService = new FeedService();
    const details: Array<{
      productId: string;
      success: boolean;
      error?: string;
      inRanking?: boolean;
      reason?: string;
    }> = [];
    let updated = 0;
    let errors = 0;
    let rankingUpdated = 0;

    // Procesar en batches de 50
    const batchSize = 50;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);

      for (const productId of batch) {
        try {
          const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
              variants: {
                include: {
                  warehouseVariants: {
                    select: { stock: true },
                  },
                },
              },
            },
          });

          if (!product) {
            throw new NotFoundError(`Producto con ID ${productId} no encontrado`);
          }

          // Calcular stock total del producto
          const totalStock = product.variants.reduce((total, variant) => {
            const variantStock = variant.warehouseVariants?.reduce(
              (sum, wv) => sum + (wv.stock || 0),
              0
            ) || 0;
            return total + variantStock;
          }, 0);

          // Calcular stock por variante
          const variantStocks = product.variants.map((variant) => {
            const totalStock = variant.warehouseVariants?.reduce(
              (sum, wv) => sum + (wv.stock || 0),
              0
            ) || 0;
            return {
              variantId: variant.id,
              stock: totalStock,
            };
          });

          // Validar requisitos para ranking
          const hasValidTitle =
            product.title &&
            product.title.trim() !== '' &&
            product.title !== 'Sin nombre';
          const hasValidImages =
            product.images &&
            Array.isArray(product.images) &&
            product.images.length > 0;
          const meetsRankingRequirements =
            totalStock >= MIN_STOCK_THRESHOLD &&
            hasValidTitle &&
            hasValidImages;

          // Actualizar estado del producto y bloquear automáticamente
          await prisma.product.update({
            where: { id: productId },
            data: {
              active,
              lockedByAdmin: true,
              lockedAt: new Date(),
              lockedBy: adminUserId,
            },
          });

          // Actualizar estado de las variantes según la lógica
          if (active) {
            // ACTIVAR: Solo activar variantes con stock >= 30
            const variantsToActivate = variantStocks
              .filter((vs) => vs.stock >= MIN_STOCK_THRESHOLD)
              .map((vs) => vs.variantId);

            const variantsToDeactivate = variantStocks
              .filter((vs) => vs.stock < MIN_STOCK_THRESHOLD)
              .map((vs) => vs.variantId);

            // Activar variantes con stock suficiente
            if (variantsToActivate.length > 0) {
              await prisma.productVariant.updateMany({
                where: {
                  id: { in: variantsToActivate },
                },
                data: {
                  active: true,
                },
              });
            }

            // Asegurar que variantes sin stock suficiente estén desactivadas
            if (variantsToDeactivate.length > 0) {
              await prisma.productVariant.updateMany({
                where: {
                  id: { in: variantsToDeactivate },
                },
                data: {
                  active: false,
                },
              });
            }

            // Agregar al ranking global solo si cumple requisitos
            if (meetsRankingRequirements) {
              try {
                await feedService.initializeItemMetrics(productId, 'product');
                await feedService.recalculateRankingForItem(productId, 'product');
                rankingUpdated++;
                details.push({
                  productId,
                  success: true,
                  inRanking: true,
                });
              } catch (error: any) {
                details.push({
                  productId,
                  success: true,
                  inRanking: false,
                  reason: `Error agregando al ranking: ${error?.message}`,
                });
              }
            } else {
              // Eliminar del ranking si no cumple requisitos
              try {
                await (prisma as any).globalRanking.deleteMany({
                  where: {
                    itemId: productId,
                    itemType: 'product',
                  },
                });
              } catch (error: any) {
                // Ignorar si no existe
              }
              const reasons: string[] = [];
              if (totalStock < MIN_STOCK_THRESHOLD) {
                reasons.push(`stock insuficiente (${totalStock} < ${MIN_STOCK_THRESHOLD})`);
              }
              if (!hasValidTitle) {
                reasons.push('título inválido');
              }
              if (!hasValidImages) {
                reasons.push('sin imágenes');
              }
              details.push({
                productId,
                success: true,
                inRanking: false,
                reason: reasons.join(', '),
              });
            }
          } else {
            // DESACTIVAR: Desactivar todas las variantes y eliminar del ranking
            await prisma.productVariant.updateMany({
              where: { productId },
              data: { active: false },
            });

            // Eliminar del ranking
            try {
              await (prisma as any).globalRanking.deleteMany({
                where: {
                  itemId: productId,
                  itemType: 'product',
                },
              });
            } catch (error: any) {
              // Ignorar si no existe
            }

            details.push({
              productId,
              success: true,
              inRanking: false,
            });
          }

          updated++;
        } catch (error: any) {
          errors++;
          details.push({
            productId,
            success: false,
            error: error?.message || 'Error desconocido',
          });
        }
      }
    }

    console.log(
      `[ADMIN PRODUCTS] Estado actualizado en masa: ${updated} actualizados, ${errors} errores, ${rankingUpdated} agregados al ranking`
    );

    return { updated, errors, rankingUpdated, details };
  }

  /**
   * Bloquear/desbloquear múltiples productos en masa
   */
  async bulkToggleLock(
    productIds: string[],
    locked: boolean,
    adminUserId: string
  ): Promise<{
    updated: number;
    errors: number;
    details: Array<{ productId: string; success: boolean; error?: string }>;
  }> {
    if (!productIds || productIds.length === 0) {
      throw new BadRequestError('Debe proporcionar al menos un ID de producto');
    }

    const details: Array<{ productId: string; success: boolean; error?: string }> = [];
    let updated = 0;
    let errors = 0;

    // Procesar en batches de 50
    const batchSize = 50;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);

      for (const productId of batch) {
        try {
          await prisma.product.update({
            where: { id: productId },
            data: {
              lockedByAdmin: locked,
              lockedAt: locked ? new Date() : null,
              lockedBy: locked ? adminUserId : null,
            },
          });
          updated++;
          details.push({ productId, success: true });
        } catch (error: any) {
          errors++;
          details.push({
            productId,
            success: false,
            error: error?.message || 'Error desconocido',
          });
        }
      }
    }

    console.log(`[ADMIN PRODUCTS] Bloqueo actualizado en masa: ${updated} actualizados, ${errors} errores`);

    return { updated, errors, details };
  }
}

