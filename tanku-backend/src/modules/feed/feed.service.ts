import { prisma } from '../../config/database';
import { FeedItemDTO, FeedCursorDTO, FeedResponseDTO } from '../../shared/dto/feed.dto';
import type { Product, ProductVariant, Category, Poster, User, UserProfile } from '@prisma/client';

/**
 * Feed Service
 * 
 * Implementa el feed combinado (productos + posters) con ranking global.
 * 
 * Principios:
 * - El feed NO se persiste por usuario
 * - El orden global es estable
 * - El cursor depende SOLO del ranking global
 * - El boost es temporal y en memoria
 * - El score es interno y nunca se expone
 */
export class FeedService {
  // Boost temporal en memoria (no persistido)
  // Formato: { "itemId:itemType": boostFactor }
  private boostMap: Map<string, number> = new Map();

  // DEBOUNCING: Cola de actualizaciones pendientes
  private updateQueue = new Map<string, NodeJS.Timeout>();
  private pendingUpdates = new Map<string, {
    wishlistCount?: number;
    ordersCount?: number;
    likesCount?: number;
    commentsCount?: number;
  }>();

  // Tiempo de debounce (15 segundos)
  private readonly DEBOUNCE_DELAY = 15000;

  // CURSOR TOKENS: Almacenar tokens → cursors en memoria
  // Formato: { "token": { cursor: FeedCursorDTO, expiresAt: Date } }
  private cursorTokens: Map<string, { cursor: FeedCursorDTO; expiresAt: Date }> = new Map();
  
  // TTL para tokens (1 hora)
  private readonly CURSOR_TOKEN_TTL = 60 * 60 * 1000; // 1 hora en ms

  // CONFIGURACIÓN HARDCODEADA
  private readonly DEFAULT_LIMIT = 50;
  private readonly DEFAULT_POSTS_PER_PRODUCTS = 5;

  /**
   * Obtener feed combinado con cursor-based pagination
   * Intercala productos (por ranking) y posts (por fecha)
   * 
   * @param cursorToken Token del cursor (opcional, para paginación)
   * @param userId ID del usuario (para boost de onboarding)
   * @param categoryId ID de categoría para filtrar (opcional)
   * @param search Query de búsqueda para filtrar productos (opcional)
   */
  async getFeed(
    cursorToken?: string,
    userId?: string,
    categoryId?: string,
    search?: string
  ): Promise<FeedResponseDTO> {
    console.log(`\n📰 [FEED-SERVICE] ========== INICIANDO GET FEED ==========`);
    console.log(`📰 [FEED-SERVICE] Cursor Token: ${cursorToken || 'No proporcionado'}`);
    console.log(`📰 [FEED-SERVICE] User ID: ${userId || 'No autenticado'}`);
    console.log(`📰 [FEED-SERVICE] Category ID: ${categoryId || 'No especificado'}`);
    console.log(`📰 [FEED-SERVICE] Search: ${search || 'No especificado'}`);

    try {
      // Limpiar tokens expirados
      this.cleanExpiredTokens();

      // Obtener cursor del token si existe
      const cursor = cursorToken ? this.getCursorFromToken(cursorToken) : undefined;
      if (cursor) {
        console.log(`📰 [FEED-SERVICE] Cursor extraído del token exitosamente`);
      }

      // Valores hardcodeados
      const limit = this.DEFAULT_LIMIT;
      const postsPerProducts = this.DEFAULT_POSTS_PER_PRODUCTS;
      console.log(`📰 [FEED-SERVICE] Limit: ${limit}, Posts per Products: ${postsPerProducts}`);
      
      // Aplicar boost temporal si hay userId (onboarding)
      let boostFactor = 1.0;
      if (userId) {
        try {
          boostFactor = await this.getBoostFactor(userId);
          console.log(`📰 [FEED-SERVICE] Boost factor obtenido: ${boostFactor}`);
        } catch (boostError: any) {
          console.warn(`⚠️ [FEED-SERVICE] Error obteniendo boost factor:`, boostError?.message);
          boostFactor = 1.0; // Usar valor por defecto si falla
        }
      }

      // Calcular cuántos productos y posts necesitamos
      // Si limit=20 y postsPerProducts=5, necesitamos ~17 productos y ~3 posts
      const estimatedProducts = Math.ceil((limit * postsPerProducts) / (postsPerProducts + 1));
      const estimatedPosts = Math.ceil(limit / (postsPerProducts + 1));
      console.log(`📰 [FEED-SERVICE] Productos estimados: ${estimatedProducts + 5}, Posts estimados: ${estimatedPosts + 2}`);
      
      // Obtener productos por ranking o búsqueda (solo productos)
      let products: any[] = [];
      try {
        // Si hay búsqueda, usar método de búsqueda que busca en todos los productos
        if (search && search.trim()) {
          console.log(`📰 [FEED-SERVICE] Obteniendo productos por búsqueda: "${search.trim()}"...`);
          products = await this.getProductsBySearch(
            search.trim(),
            cursor,
            estimatedProducts + 5, // Buffer extra para asegurar suficientes productos
            categoryId
          );
        } else {
          console.log(`📰 [FEED-SERVICE] Obteniendo productos por ranking...`);
          products = await this.getProductsByRanking(
            cursor,
            estimatedProducts + 5, // Buffer extra para asegurar suficientes productos
            boostFactor,
            categoryId
          );
        }
        console.log(`📰 [FEED-SERVICE] Productos obtenidos: ${products.length}`);
      } catch (productsError: any) {
        // Si es error de tabla no existente, continuar solo con posts
        if (productsError?.code === 'P2021' || productsError?.message?.includes('does not exist')) {
          console.warn(`⚠️ [FEED-SERVICE] Tabla global_ranking no existe. Continuando solo con posts.`);
          console.warn(`⚠️ [FEED-SERVICE] Para habilitar productos, ejecutar: npm run fix:feed:tables`);
          products = [];
        } else {
          console.error(`❌ [FEED-SERVICE] Error obteniendo productos:`, productsError?.message);
          console.error(`❌ [FEED-SERVICE] Stack:`, productsError?.stack);
          // Continuar con array vacío en lugar de fallar completamente
          products = [];
        }
      }

      // Obtener posts por fecha (solo posts)
      let posts: any[] = [];
      try {
        console.log(`📰 [FEED-SERVICE] Obteniendo posts por fecha...`);
        posts = await this.getPostsByDate(
          cursor,
          estimatedPosts + 2 // Buffer extra
        );
        console.log(`📰 [FEED-SERVICE] Posts obtenidos: ${posts.length}`);
      } catch (postsError: any) {
        console.error(`❌ [FEED-SERVICE] Error obteniendo posts:`, postsError?.message);
        console.error(`❌ [FEED-SERVICE] Stack:`, postsError?.stack);
        // Continuar con array vacío en lugar de fallar completamente
        posts = [];
      }

      // Intercalar productos y posts según la regla
      console.log(`📰 [FEED-SERVICE] Intercalando productos y posts...`);
      const intercalated = this.intercalateItems(products, posts, limit, postsPerProducts);
      console.log(`📰 [FEED-SERVICE] Items intercalados: ${intercalated.items.length}`);

      // Separar productos y posters para batch queries
      const productIds = intercalated.items
        .filter(item => item.itemType === 'product')
        .map(item => item.itemId);
      
      const posterIds = intercalated.items
        .filter(item => item.itemType === 'poster')
        .map(item => item.itemId);

      console.log(`📰 [FEED-SERVICE] Product IDs para batch query: ${productIds.length}`);
      console.log(`📰 [FEED-SERVICE] Poster IDs para batch query: ${posterIds.length}`);

      // Batch query para productos (una sola query en lugar de N queries)
      let productsData: any[] = [];
      try {
        if (productIds.length > 0) {
          console.log(`📰 [FEED-SERVICE] Ejecutando batch query para productos...`);
          productsData = await prisma.product.findMany({
            where: { id: { in: productIds } },
            include: {
              category: true,
              variants: {
                where: { active: true },
                orderBy: { price: 'asc' },
                take: 1,
              },
            },
          });
          console.log(`📰 [FEED-SERVICE] Productos obtenidos de BD: ${productsData.length}`);
        }
      } catch (productsDataError: any) {
        console.error(`❌ [FEED-SERVICE] Error en batch query de productos:`, productsDataError?.message);
        console.error(`❌ [FEED-SERVICE] Stack:`, productsDataError?.stack);
        productsData = [];
      }

      // Batch query para posters (una sola query en lugar de N queries)
      let postersData: any[] = [];
      try {
        if (posterIds.length > 0) {
          console.log(`📰 [FEED-SERVICE] Ejecutando batch query para posters...`);
          postersData = await prisma.poster.findMany({
            where: { id: { in: posterIds } },
            include: {
              customer: {
                include: {
                  profile: true,
                },
              },
            },
          });
          console.log(`📰 [FEED-SERVICE] Posters obtenidos de BD: ${postersData.length}`);
        }
      } catch (postersDataError: any) {
        console.error(`❌ [FEED-SERVICE] Error en batch query de posters:`, postersDataError?.message);
        console.error(`❌ [FEED-SERVICE] Stack:`, postersDataError?.stack);
        postersData = [];
      }

      // Crear mapas para acceso rápido O(1)
      const productMap = new Map(productsData.map(p => [p.id, p]));
      const posterMap = new Map(postersData.map(p => [p.id, p]));

      console.log(`📰 [FEED-SERVICE] Mapas creados: ${productMap.size} productos, ${posterMap.size} posters`);

      // Mapear items en el orden correcto (mantener orden de intercalación)
      const feedItems: FeedItemDTO[] = [];
      for (const item of intercalated.items) {
      if (item.itemType === 'product') {
        const product = productMap.get(item.itemId);
        if (!product) continue; // Saltar si no se encontró el producto
        
        const firstVariant = product.variants[0];
        const imageUrl = (product.images && product.images.length > 0
          ? this.normalizeImageUrl(product.images[0]) || ''
          : '') || '';
        
        // Calcular precio con incremento (15% + $10,000) - igual que en el carrito
        const basePrice = firstVariant?.suggestedPrice || firstVariant?.price || 0;
        const finalPrice = basePrice > 0 ? Math.round((basePrice * 1.15) + 10000) : undefined;
        
        feedItems.push({
          id: product.id,
          type: 'product',
          createdAt: product.createdAt.toISOString(),
          title: product.title,
          imageUrl,
          price: finalPrice,
          handle: product.handle, // Agregar handle del producto
          category: product.category ? {
            id: product.category.id,
            name: product.category.name,
            handle: product.category.handle,
          } : undefined,
        });
      } else {
        const poster = posterMap.get(item.itemId);
        if (!poster) continue; // Saltar si no se encontró el poster
        
        feedItems.push({
          id: poster.id,
          type: 'poster',
          createdAt: poster.createdAt.toISOString(),
          imageUrl: poster.imageUrl,
          description: poster.description || undefined,
          videoUrl: poster.videoUrl || undefined,
          likesCount: poster.likesCount,
          commentsCount: poster.commentsCount,
          author: poster.customer ? {
            id: poster.customer.id,
            email: poster.customer.email,
            firstName: poster.customer.firstName,
            lastName: poster.customer.lastName,
            avatar: poster.customer.profile?.avatar || null,
          } : undefined,
        });
      }
      }

      console.log(`📰 [FEED-SERVICE] Feed items mapeados: ${feedItems.length}`);

      // Crear cursor híbrido para siguiente página
      console.log(`📰 [FEED-SERVICE] Creando cursor híbrido...`);
      const nextCursor = this.createHybridCursor(
        intercalated,
        products,
        posts,
        cursor,
        estimatedProducts + 5, // Límite solicitado para productos
        estimatedPosts + 2     // Límite solicitado para posts
      );

      // Generar token para siguiente página si hay más items
      const nextCursorToken = nextCursor ? this.generateCursorToken(nextCursor) : null;

      console.log(`📰 [FEED-SERVICE] Cursor token generado: ${nextCursorToken ? 'Sí' : 'No'}`);
      console.log(`📰 [FEED-SERVICE] ========== FEED OBTENIDO EXITOSAMENTE ==========\n`);

      return {
        items: feedItems,
        nextCursorToken,
      };
    } catch (error: any) {
      console.error(`\n❌ [FEED-SERVICE] ========== ERROR EN GET FEED ==========`);
      console.error(`❌ [FEED-SERVICE] Error:`, error?.message);
      console.error(`❌ [FEED-SERVICE] Stack:`, error?.stack);
      console.error(`❌ [FEED-SERVICE] Name:`, error?.name);
      console.error(`❌ [FEED-SERVICE] =========================================\n`);
      
      // Retornar feed vacío en lugar de fallar completamente
      // Esto permite que el frontend siga funcionando aunque el feed no esté disponible
      return {
        items: [],
        nextCursorToken: null,
      };
    }
  }

  /**
   * Normalizar URL de imagen (si viene relativa) para el feed
   */
  private normalizeImageUrl(imagePath: string | null | undefined): string | null {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const cdnBase = process.env.DROPI_CDN_BASE || 'https://d39ru7awumhhs2.cloudfront.net';
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    return `${cdnBase}/${cleanPath}`;
  }

  /**
   * Generar token único para un cursor
   */
  private generateCursorToken(cursor: FeedCursorDTO): string {
    // Generar token único (usando timestamp + random)
    const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Almacenar cursor con TTL
    this.cursorTokens.set(token, {
      cursor,
      expiresAt: new Date(Date.now() + this.CURSOR_TOKEN_TTL),
    });

    return token;
  }

  /**
   * Obtener cursor desde token
   */
  private getCursorFromToken(token: string): FeedCursorDTO | undefined {
    const stored = this.cursorTokens.get(token);
    
    if (!stored) {
      return undefined; // Token no encontrado
    }

    // Verificar si expiró
    if (stored.expiresAt < new Date()) {
      this.cursorTokens.delete(token);
      return undefined; // Token expirado
    }

    return stored.cursor;
  }

  /**
   * Limpiar tokens expirados
   */
  private cleanExpiredTokens(): void {
    const now = new Date();
    for (const [token, stored] of this.cursorTokens.entries()) {
      if (stored.expiresAt < now) {
        this.cursorTokens.delete(token);
      }
    }
  }

  /**
   * Obtener productos por ranking (solo productos)
   */
  private async getProductsByRanking(
    cursor: FeedCursorDTO | undefined,
    limit: number,
    boostFactor: number,
    categoryId?: string
  ) {
    // Primero obtener IDs de productos de la categoría si se especifica
    let productIds: string[] | undefined;
    if (categoryId) {
      const productsInCategory = await prisma.product.findMany({
        where: { categoryId },
        select: { id: true },
      });
      productIds = productsInCategory.map(p => p.id);
      
      if (productIds.length === 0) {
        // No hay productos en esta categoría
        return [];
      }
    }

    const where: any = {
      itemType: 'product', // Solo productos
    };

    // Aplicar filtro de categoría si existe
    if (productIds) {
      where.itemId = {
        in: productIds,
      };
    }

    // Aplicar cursor para productos si existe
    if (cursor?.lastProductScore !== undefined) {
      const cursorConditions: any[] = [
        {
          globalScore: {
            lt: cursor.lastProductScore,
          },
        },
        {
          AND: [
            {
              globalScore: cursor.lastProductScore,
            },
            ...(cursor.lastProductCreatedAt ? [{
              createdAt: {
                lt: new Date(cursor.lastProductCreatedAt),
              },
            }] : []),
          ],
        },
        {
          AND: [
            {
              globalScore: cursor.lastProductScore,
            },
            ...(cursor.lastProductCreatedAt ? [{
              createdAt: new Date(cursor.lastProductCreatedAt),
            }] : []),
            {
              itemId: {
                not: cursor.lastProductId,
              },
            },
          ],
        },
      ];

      // Combinar cursor con filtro de categoría si existe
      if (productIds) {
        where.AND = [
          {
            itemId: {
              in: productIds,
            },
          },
          {
            OR: cursorConditions,
          },
        ];
      } else {
        where.OR = cursorConditions;
      }
    } else if (cursor?.lastGlobalScore !== undefined) {
      // Compatibilidad con cursor legacy
      const legacyCursorConditions: any[] = [
        {
          globalScore: {
            lt: cursor.lastGlobalScore,
          },
        },
        {
          AND: [
            {
              globalScore: cursor.lastGlobalScore,
            },
            {
              createdAt: {
                lt: cursor.lastCreatedAt ? new Date(cursor.lastCreatedAt) : undefined,
              },
            },
          ],
        },
        {
          AND: [
            {
              globalScore: cursor.lastGlobalScore,
            },
            {
              createdAt: cursor.lastCreatedAt ? new Date(cursor.lastCreatedAt) : undefined,
            },
            {
              itemId: {
                not: cursor.lastItemId,
              },
            },
          ],
        },
      ];

      // Combinar cursor legacy con filtro de categoría si existe
      if (productIds) {
        where.AND = [
          {
            itemId: {
              in: productIds,
            },
          },
          {
            OR: legacyCursorConditions,
          },
        ];
      } else {
        where.OR = legacyCursorConditions;
      }
    }

    // Obtener productos del ranking
    // Verificar que el modelo GlobalRanking existe en Prisma
    let rankingItems: any[] = [];
    try {
      // Acceso directo al modelo GlobalRanking (debe estar generado por prisma generate)
      rankingItems = await prisma.globalRanking.findMany({
        where,
        orderBy: [
          { globalScore: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });
    } catch (error: any) {
      // Verificar si es el error específico de tabla no existente (P2021)
      if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.meta?.modelName === 'GlobalRanking') {
        console.error('[FEED-SERVICE] ❌ La tabla global_ranking no existe en la base de datos.');
        console.error('[FEED-SERVICE] Ejecutar: npm run fix:feed:tables');
        console.error('[FEED-SERVICE] Continuando con feed sin productos (solo posts)...');
        // Retornar array vacío para que el feed funcione solo con posts
        return [];
      }
      
      // Otros errores de Prisma
      if (error?.code?.startsWith('P')) {
        console.error(`[FEED-SERVICE] Error de Prisma (${error.code}):`, error?.message);
        console.error('[FEED-SERVICE] Continuando con feed sin productos...');
        return [];
      }
      
      // Si el modelo no existe, intentar con cast (fallback para desarrollo)
      console.warn('[FEED-SERVICE] Error accediendo a globalRanking, intentando con cast:', error?.message);
      try {
        rankingItems = await (prisma as any).globalRanking.findMany({
          where,
          orderBy: [
            { globalScore: 'desc' },
            { createdAt: 'desc' },
          ],
          take: limit,
        });
      } catch (fallbackError: any) {
        console.error('[FEED-SERVICE] Error crítico accediendo a globalRanking:', fallbackError?.message);
        console.error('[FEED-SERVICE] Verificar que el modelo GlobalRanking existe en Prisma schema y ejecutar: npx prisma generate');
        // Retornar array vacío en lugar de fallar completamente
        return [];
      }
    }

    // Aplicar boost temporal (solo para ordenamiento, no modifica BD)
    if (boostFactor !== 1.0) {
      rankingItems.forEach((item: any) => {
        const boostKey = `${item.itemId}:${item.itemType}`;
        const itemBoost = this.boostMap.get(boostKey) || 1.0;
        item.boostedScore = item.globalScore * itemBoost * boostFactor;
      });

      // Reordenar por boostedScore
      rankingItems.sort((a: any, b: any) => {
        const aScore = a.boostedScore || a.globalScore;
        const bScore = b.boostedScore || b.globalScore;
        return bScore - aScore;
      });
    }

    return rankingItems;
  }

  /**
   * Obtener productos por búsqueda (cuando hay search query)
   * Busca directamente en la tabla de productos usando el servicio de productos
   * 
   * @param searchQuery Query de búsqueda
   * @param cursor Cursor para paginación (opcional)
   * @param limit Límite de productos a retornar
   * @param categoryId ID de categoría para filtrar (opcional)
   */
  private async getProductsBySearch(
    searchQuery: string,
    cursor: FeedCursorDTO | undefined,
    limit: number,
    categoryId?: string
  ) {
    console.log(`🔍 [FEED-SERVICE] Buscando productos con query: "${searchQuery}"`);
    
    // Construir la query de búsqueda directamente en Prisma
    // para tener mejor control sobre la paginación con cursor
    const where: any = {};
    
    // Condiciones de búsqueda: buscar en título, descripción y variantes
    const searchConditions = {
      OR: [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { 
          variants: {
            some: {
              OR: [
                { sku: { contains: searchQuery, mode: 'insensitive' } },
                { title: { contains: searchQuery, mode: 'insensitive' } },
              ]
            }
          }
        },
      ],
    };
    
    // Construir condiciones de where
    const conditions: any[] = [searchConditions];
    
    // Filtro por categoría si se especifica
    if (categoryId) {
      conditions.push({ categoryId });
    }
    
    // Aplicar cursor si existe (paginación basada en fecha e ID)
    if (cursor?.lastProductCreatedAt && cursor?.lastProductId) {
      conditions.push({
        OR: [
          { createdAt: { lt: new Date(cursor.lastProductCreatedAt) } },
          {
            AND: [
              { createdAt: new Date(cursor.lastProductCreatedAt) },
              { id: { not: cursor.lastProductId } },
            ],
          },
        ],
      });
    }
    
    // Combinar todas las condiciones
    if (conditions.length === 1) {
      Object.assign(where, searchConditions);
      if (categoryId) {
        where.categoryId = categoryId;
      }
    } else {
      where.AND = conditions;
    }
    
    // Obtener productos con búsqueda y paginación
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: [
        { createdAt: 'desc' }, // Más recientes primero
      ],
      take: limit,
    });
    
    console.log(`🔍 [FEED-SERVICE] Productos encontrados en búsqueda: ${products.length}`);
    
    // Convertir productos a formato compatible con ranking items
    const productsWithDates = products.map((product) => ({
      itemId: product.id,
      itemType: 'product' as const,
      globalScore: 0, // No usado para búsqueda, pero necesario para compatibilidad
      createdAt: product.createdAt,
    }));
    
    return productsWithDates;
  }

  /**
   * Obtener posts por fecha (solo posts, más recientes primero)
   */
  private async getPostsByDate(
    cursor: FeedCursorDTO | undefined,
    limit: number
  ) {
    const where: any = {
      isActive: true,
    };

    // Aplicar cursor para posts si existe
    if (cursor?.lastPostCreatedAt) {
      where.OR = [
        {
          createdAt: {
            lt: new Date(cursor.lastPostCreatedAt),
          },
        },
        {
          AND: [
            {
              createdAt: new Date(cursor.lastPostCreatedAt),
            },
            {
              id: {
                not: cursor.lastPostId,
              },
            },
          ],
        },
      ];
    }

    // Obtener posts ordenados por fecha
    const posts = await prisma.poster.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        createdAt: true,
      },
    });

    // Convertir a formato compatible con ranking items
    return posts.map((post) => ({
      itemId: post.id,
      itemType: 'poster' as const,
      globalScore: 0, // No usado para posts
      createdAt: post.createdAt,
    }));
  }

  /**
   * Intercalar productos y posts según la regla
   * Cada N productos, insertar 1 post
   */
  private intercalateItems(
    products: any[],
    posts: any[],
    limit: number,
    postsPerProducts: number
  ): {
    items: Array<{ itemId: string; itemType: 'product' | 'poster'; createdAt: Date; globalScore?: number }>;
    lastProductIndex: number;
    lastPostIndex: number;
  } {
    const intercalated: Array<{ itemId: string; itemType: 'product' | 'poster'; createdAt: Date; globalScore?: number }> = [];
    let productIndex = 0;
    let postIndex = 0;
    let itemsAdded = 0;

    while (itemsAdded < limit && (productIndex < products.length || postIndex < posts.length)) {
      // Calcular si toca insertar post
      const shouldInsertPost = intercalated.length > 0 && 
        (intercalated.length % (postsPerProducts + 1)) === postsPerProducts;

      if (shouldInsertPost && postIndex < posts.length) {
        // Insertar post
        intercalated.push({
          itemId: posts[postIndex].itemId,
          itemType: 'poster',
          createdAt: posts[postIndex].createdAt,
        });
        postIndex++;
        itemsAdded++;
      } else if (productIndex < products.length) {
        // Insertar producto
        intercalated.push({
          itemId: products[productIndex].itemId,
          itemType: 'product',
          createdAt: products[productIndex].createdAt,
          globalScore: products[productIndex].globalScore,
        });
        productIndex++;
        itemsAdded++;
      } else if (postIndex < posts.length) {
        // Si no hay más productos, seguir con posts
        intercalated.push({
          itemId: posts[postIndex].itemId,
          itemType: 'poster',
          createdAt: posts[postIndex].createdAt,
        });
        postIndex++;
        itemsAdded++;
      } else {
        // No hay más items
        break;
      }
    }

    return {
      items: intercalated,
      lastProductIndex: productIndex,
      lastPostIndex: postIndex,
    };
  }

  /**
   * Crear cursor híbrido para siguiente página
   */
  private createHybridCursor(
    intercalated: { items: any[]; lastProductIndex: number; lastPostIndex: number },
    products: any[],
    posts: any[],
    previousCursor: FeedCursorDTO | undefined,
    productsLimit: number,
    postsLimit: number
  ): FeedCursorDTO | null {
    if (intercalated.items.length === 0) {
      return null;
    }

    const lastItem = intercalated.items[intercalated.items.length - 1];
    const cursor: FeedCursorDTO = {
      lastItemType: lastItem.itemType,
      lastItemIndex: intercalated.items.length - 1,
    };

    // Si el último item es un producto, trackear cursor de productos
    if (lastItem.itemType === 'product' && products.length > 0) {
      const lastProduct = products.find((p: any) => p.itemId === lastItem.itemId) || 
                         products[intercalated.lastProductIndex - 1];
      if (lastProduct) {
        cursor.lastProductScore = lastProduct.globalScore;
        cursor.lastProductCreatedAt = lastProduct.createdAt.toISOString();
        cursor.lastProductId = lastProduct.itemId;
      }
    }

    // Si el último item es un post, trackear cursor de posts
    if (lastItem.itemType === 'poster' && posts.length > 0) {
      const lastPost = posts.find((p: any) => p.itemId === lastItem.itemId) || 
                       posts[intercalated.lastPostIndex - 1];
      if (lastPost) {
        cursor.lastPostCreatedAt = lastPost.createdAt.toISOString();
        cursor.lastPostId = lastPost.itemId;
      }
    }

    // Verificar si hay más items disponibles
    const hasMoreProducts = intercalated.lastProductIndex < products.length;
    const hasMorePosts = intercalated.lastPostIndex < posts.length;
    
    // Si se obtuvieron exactamente el límite solicitado, probablemente hay más en la BD
    // Esto evita una query adicional a la BD
    const productsReachedLimit = products.length >= productsLimit;
    const postsReachedLimit = posts.length >= postsLimit;
    
    // Hay más si:
    // 1. Hay más items en los arrays obtenidos, O
    // 2. Se alcanzó el límite solicitado (sugiere que hay más en la BD)
    const hasMore = hasMoreProducts || hasMorePosts || productsReachedLimit || postsReachedLimit;

    if (!hasMore) {
      return null;
    }

    return cursor;
  }

  /**
   * Obtener items del ranking global con cursor (método legacy, mantenido por compatibilidad)
   */
  private async getRankingItems(
    cursor: FeedCursorDTO | undefined,
    limit: number,
    boostFactor: number
  ) {
    const where: any = {};

    // Aplicar cursor si existe
    if (cursor) {
      where.OR = [
        {
          globalScore: {
            lt: cursor.lastGlobalScore,
          },
        },
        {
          AND: [
            {
              globalScore: cursor.lastGlobalScore,
            },
            {
              createdAt: {
                lt: cursor.lastCreatedAt ? new Date(cursor.lastCreatedAt) : undefined,
              },
            },
          ],
        },
        {
          AND: [
            {
              globalScore: cursor.lastGlobalScore,
            },
            {
              createdAt: cursor.lastCreatedAt ? new Date(cursor.lastCreatedAt) : undefined,
            },
            {
              itemId: {
                not: cursor.lastItemId,
              },
            },
          ],
        },
      ];
    }

    // Obtener items del ranking
    const rankingItems = await (prisma as any).globalRanking.findMany({
      where,
      orderBy: [
        { globalScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    // Aplicar boost temporal (solo para ordenamiento, no modifica BD)
    if (boostFactor !== 1.0) {
      rankingItems.forEach((item: any) => {
        const boostKey = `${item.itemId}:${item.itemType}`;
        const itemBoost = this.boostMap.get(boostKey) || 1.0;
        item.boostedScore = item.globalScore * itemBoost * boostFactor;
      });

      // Reordenar por boostedScore
      rankingItems.sort((a: any, b: any) => {
        const aScore = a.boostedScore || a.globalScore;
        const bScore = b.boostedScore || b.globalScore;
        return bScore - aScore;
      });
    }

    return rankingItems;
  }


  /**
   * Mapear producto a FeedItemDTO
   */
  private async mapProductToFeedItem(productId: string): Promise<FeedItemDTO> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        variants: {
          where: { active: true },
          orderBy: { price: 'asc' },
          take: 1,
        },
      },
    });

    if (!product) {
      throw new Error(`Producto ${productId} no encontrado`);
    }

    const firstVariant = product.variants[0];
    // Obtener imagen del array de imágenes del producto
    const imageUrl = (product.images && product.images.length > 0 ? product.images[0] : '') || '';

    return {
      id: product.id,
      type: 'product',
      createdAt: product.createdAt.toISOString(),
      title: product.title,
      imageUrl,
      price: firstVariant?.price || undefined,
      handle: product.handle, // Agregar handle del producto
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            handle: product.category.handle,
          }
        : undefined,
    };
  }

  /**
   * Mapear poster a FeedItemDTO
   */
  private async mapPosterToFeedItem(posterId: string): Promise<FeedItemDTO> {
    const poster = await prisma.poster.findUnique({
      where: { id: posterId },
      include: {
        customer: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!poster) {
      throw new Error(`Poster ${posterId} no encontrado`);
    }

    return {
      id: poster.id,
      type: 'poster',
      createdAt: poster.createdAt.toISOString(),
      imageUrl: poster.imageUrl,
      description: poster.description || undefined,
      videoUrl: poster.videoUrl || undefined,
      likesCount: poster.likesCount,
      commentsCount: poster.commentsCount,
      author: poster.customer
        ? {
            id: poster.customer.id,
            email: poster.customer.email,
            firstName: poster.customer.firstName,
            lastName: poster.customer.lastName,
            avatar: poster.customer.profile?.avatar || null,
          }
        : undefined,
    };
  }

  /**
   * Obtener factor de boost para un usuario (onboarding)
   * Implementa lógica de boost basada en onboarding y preferencias
   */
  private async getBoostFactor(userId: string): Promise<number> {
    try {
      // Verificar onboarding desde PersonalInformation.metadata
      const personalInfo = await prisma.personalInformation.findUnique({
        where: { userId },
        select: { metadata: true },
      });

      if (!personalInfo) {
        // Usuario nuevo sin PersonalInformation: boost contenido popular
        return 1.5;
      }

      const metadata = (personalInfo.metadata as any) || {};
      const onboardingData = metadata?.onboarding;

      // Si no tiene datos de onboarding o no ha completado pasos básicos: boost
      if (
        !onboardingData ||
        !onboardingData.completedSteps ||
        onboardingData.completedSteps.length === 0
      ) {
        return 1.5; // 50% más visible para usuarios nuevos
      }

      // Usuario con onboarding progresado: sin boost (o boost personalizado futuro)
      // TODO: Implementar boost basado en:
      // - Preferencias del usuario
      // - Items vistos recientemente
      // - Intereses/categorías favoritas
      return 1.0;
    } catch (error) {
      // Si hay error, retornar sin boost
      console.error(`Error obteniendo boost factor para ${userId}:`, error);
      return 1.0;
    }
  }

  /**
   * Aplicar boost temporal a un item (en memoria)
   * Esto NO modifica el ranking global, solo afecta el ordenamiento temporal
   */
  applyBoost(itemId: string, itemType: 'product' | 'poster', boostFactor: number) {
    const key = `${itemId}:${itemType}`;
    this.boostMap.set(key, boostFactor);
  }

  /**
   * Remover boost temporal de un item
   */
  removeBoost(itemId: string, itemType: 'product' | 'poster') {
    const key = `${itemId}:${itemType}`;
    this.boostMap.delete(key);
  }

  /**
   * Actualizar métricas con debouncing (recomendado para alta carga)
   * Agrupa múltiples actualizaciones y las ejecuta después del delay (15 segundos)
   * 
   * Ejemplo: Si 100 usuarios dan like en 10 segundos, solo hace 1 query
   * 
   * @param itemId ID del item
   * @param itemType Tipo: 'product' o 'poster'
   * @param updates Objeto con los contadores a actualizar
   */
  async updateItemMetricsDebounced(
    itemId: string,
    itemType: 'product' | 'poster',
    updates: {
      wishlistCount?: number;
      ordersCount?: number;
      likesCount?: number;
      commentsCount?: number;
    }
  ) {
    const key = `${itemId}:${itemType}`;

    // Si hay una actualización pendiente, cancelarla
    if (this.updateQueue.has(key)) {
      clearTimeout(this.updateQueue.get(key)!);
    }

    // Guardar/mergear updates pendientes
    const current = this.pendingUpdates.get(key) || {};
    this.pendingUpdates.set(key, {
      ...current,
      ...updates,
    });

    // Programar actualización después del delay
    const timeout = setTimeout(async () => {
      try {
        const finalUpdates = this.pendingUpdates.get(key);
        if (finalUpdates) {
          // Ejecutar actualización real
          await this.updateItemMetrics(itemId, itemType, finalUpdates);

          // Limpiar
          this.pendingUpdates.delete(key);
        }
      } catch (error) {
        console.error(`Error en updateItemMetricsDebounced para ${key}:`, error);
      } finally {
        this.updateQueue.delete(key);
      }
    }, this.DEBOUNCE_DELAY);

    this.updateQueue.set(key, timeout);
  }

  /**
   * Actualizar métricas de un item (método original - mantener para casos especiales)
   * Se llama cuando hay cambios en wishlist, orders, likes, comments
   * 
   * NOTA: Para uso normal, usar updateItemMetricsDebounced() en su lugar
   */
  async updateItemMetrics(
    itemId: string,
    itemType: 'product' | 'poster',
    updates: {
      wishlistCount?: number;
      ordersCount?: number;
      likesCount?: number;
      commentsCount?: number;
    }
  ) {
    await (prisma as any).itemMetric.upsert({
      where: {
        itemId_itemType: {
          itemId,
          itemType,
        },
      },
      update: {
        ...updates,
        updatedAt: new Date(),
      },
      create: {
        itemId,
        itemType,
        wishlistCount: updates.wishlistCount || 0,
        ordersCount: updates.ordersCount || 0,
        likesCount: updates.likesCount || 0,
        commentsCount: updates.commentsCount || 0,
      },
    });

    // Recalcular ranking global (async, no bloquea)
    this.recalculateRanking(itemId, itemType).catch((error) => {
      console.error(`Error recalculando ranking para ${itemId}:${itemType}`, error);
    });
  }

  /**
   * Recalcular ranking global para un item
   * Basado en métricas: wishlist_count, orders_count, likes_count, comments_count
   */
  private async recalculateRanking(
    itemId: string,
    itemType: 'product' | 'poster'
  ) {
    const metrics = await (prisma as any).itemMetric.findUnique({
      where: {
        itemId_itemType: {
          itemId,
          itemType,
        },
      },
    });

    if (!metrics) {
      return;
    }

    // Calcular score global
    // Fórmula: (wishlist * 1) + (orders * 5) + (likes * 2) + (comments * 3)
    // Los pesos pueden ajustarse según necesidades
    const globalScore =
      metrics.wishlistCount * 1 +
      metrics.ordersCount * 5 +
      metrics.likesCount * 2 +
      metrics.commentsCount * 3;

    // Obtener createdAt del item original
    let createdAt: Date;
    if (itemType === 'product') {
      const product = await prisma.product.findUnique({
        where: { id: itemId },
        select: { createdAt: true },
      });
      createdAt = product?.createdAt || new Date();
    } else {
      const poster = await prisma.poster.findUnique({
        where: { id: itemId },
        select: { createdAt: true },
      });
      createdAt = poster?.createdAt || new Date();
    }

    // Actualizar o crear ranking global
    await (prisma as any).globalRanking.upsert({
      where: {
        itemId_itemType: {
          itemId,
          itemType,
        },
      },
      update: {
        globalScore,
        updatedAt: new Date(),
      },
      create: {
        itemId,
        itemType,
        globalScore,
        createdAt,
      },
    });
  }

  /**
   * Inicializar métricas para un item nuevo
   * Se llama cuando se crea un producto o poster
   */
  async initializeItemMetrics(
    itemId: string,
    itemType: 'product' | 'poster'
  ) {
    await (prisma as any).itemMetric.upsert({
      where: {
        itemId_itemType: {
          itemId,
          itemType,
        },
      },
      update: {},
      create: {
        itemId,
        itemType,
        wishlistCount: 0,
        ordersCount: 0,
        likesCount: 0,
        commentsCount: 0,
      },
    });

    // Inicializar ranking global con score 0
    let createdAt: Date;
    if (itemType === 'product') {
      const product = await prisma.product.findUnique({
        where: { id: itemId },
        select: { createdAt: true },
      });
      createdAt = product?.createdAt || new Date();
    } else {
      const poster = await prisma.poster.findUnique({
        where: { id: itemId },
        select: { createdAt: true },
      });
      createdAt = poster?.createdAt || new Date();
    }

    await (prisma as any).globalRanking.upsert({
      where: {
        itemId_itemType: {
          itemId,
          itemType,
        },
      },
      update: {},
      create: {
        itemId,
        itemType,
        globalScore: 0,
        createdAt,
      },
    });
  }
}

