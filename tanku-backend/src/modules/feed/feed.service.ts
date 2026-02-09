import { prisma } from '../../config/database';
import { FeedItemDTO, FeedCursorDTO, FeedResponseDTO } from '../../shared/dto/feed.dto';
import { Prisma } from '@prisma/client';
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
    // Logs reducidos - solo información esencial

    try {
      // Limpiar tokens expirados
      this.cleanExpiredTokens();

      // Obtener cursor del token si existe
      const cursor = cursorToken ? this.getCursorFromToken(cursorToken) : undefined;
      if (cursor) {
      }

      // Valores hardcodeados
      const limit = this.DEFAULT_LIMIT;
      const postsPerProducts = this.DEFAULT_POSTS_PER_PRODUCTS;
      
      // Aplicar boost temporal si hay userId (onboarding)
      let boostFactor = 1.0;
      if (userId) {
        try {
          boostFactor = await this.getBoostFactor(userId);
        } catch (boostError: any) {
          console.warn(`⚠️ [FEED-SERVICE] Error obteniendo boost factor:`, boostError?.message);
          boostFactor = 1.0; // Usar valor por defecto si falla
        }
      }

      // Calcular cuántos productos y posts necesitamos
      // Si limit=20 y postsPerProducts=5, necesitamos ~17 productos y ~3 posts
      const estimatedProducts = Math.ceil((limit * postsPerProducts) / (postsPerProducts + 1));
      const estimatedPosts = Math.ceil(limit / (postsPerProducts + 1));
      
      // Obtener productos por ranking o búsqueda (solo productos)
      let products: any[] = [];
      try {
        // Si hay búsqueda, usar método de búsqueda que busca en todos los productos
        if (search && search.trim()) {
          products = await this.getProductsBySearch(
            search.trim(),
            cursor,
            estimatedProducts + 5, // Buffer extra para asegurar suficientes productos
            categoryId
          );
        } else {
          products = await this.getProductsByRanking(
            cursor,
            estimatedProducts + 5, // Buffer extra para asegurar suficientes productos
            boostFactor,
            categoryId
          );
        }
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

      // Obtener posts por fecha (solo posts, filtrados por amigos + propio si hay userId)
      let posts: any[] = [];
      try {
        posts = await this.getPostsByDate(
          cursor,
          estimatedPosts + 2, // Buffer extra
          userId // Pasar userId para filtrar por amigos + propio
        );
      } catch (postsError: any) {
        console.error(`❌ [FEED-SERVICE] Error obteniendo posts:`, postsError?.message);
        console.error(`❌ [FEED-SERVICE] Stack:`, postsError?.stack);
        // Continuar con array vacío en lugar de fallar completamente
        posts = [];
      }

      // Intercalar productos y posts según la regla
      const intercalated = this.intercalateItems(products, posts, limit, postsPerProducts);

      // Separar productos y posters para batch queries
      const productIds = intercalated.items
        .filter(item => item.itemType === 'product')
        .map(item => item.itemId);
      
      const posterIds = intercalated.items
        .filter(item => item.itemType === 'poster')
        .map(item => item.itemId);


      // Batch query para productos (una sola query en lugar de N queries)
      let productsData: any[] = [];
      try {
        if (productIds.length > 0) {
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
        }
      } catch (postersDataError: any) {
        console.error(`❌ [FEED-SERVICE] Error en batch query de posters:`, postersDataError?.message);
        console.error(`❌ [FEED-SERVICE] Stack:`, postersDataError?.stack);
        postersData = [];
      }

      // Crear mapas para acceso rápido O(1)
      const productMap = new Map(productsData.map(p => [p.id, p]));
      const posterMap = new Map(postersData.map(p => [p.id, p]));


      // ✅ DIAGNÓSTICO: Verificar productos faltantes en productMap
      const missingProducts: string[] = [];
      const productItems = intercalated.items.filter(item => item.itemType === 'product');
      for (const item of productItems) {
        if (!productMap.has(item.itemId)) {
          missingProducts.push(item.itemId);
        }
      }
      if (missingProducts.length > 0) {
        console.warn(`⚠️ [FEED-SERVICE] ${missingProducts.length} productos en ranking no encontrados en BD (de ${productItems.length} productos en ranking)`);
        console.warn(`⚠️ [FEED-SERVICE] Primeros 10 IDs faltantes:`, missingProducts.slice(0, 10));
      } else {
      }

      // Obtener métricas de likes para productos (batch query)
      const productIdsForMetrics = Array.from(productMap.keys());
      const itemMetricsMap = new Map<string, { likesCount: number }>();
      if (productIdsForMetrics.length > 0) {
        try {
          const metrics = await (prisma as any).itemMetric.findMany({
            where: {
              itemId: { in: productIdsForMetrics },
              itemType: 'product',
            },
            select: {
              itemId: true,
              likesCount: true,
            },
          });
          metrics.forEach((m: any) => {
            itemMetricsMap.set(m.itemId, { likesCount: m.likesCount || 0 });
          });
        } catch (error) {
          console.error('Error obteniendo métricas de likes:', error);
        }
      }

      // Obtener likes del usuario actual para productos (batch query)
      const userLikedProductsSet = new Set<string>();
      if (userId && productIdsForMetrics.length > 0) {
        try {
          const userLikes = await prisma.productLike.findMany({
            where: {
              userId,
              productId: { in: productIdsForMetrics },
            },
            select: {
              productId: true,
            },
          });
          userLikes.forEach((like) => {
            userLikedProductsSet.add(like.productId);
          });
        } catch (error) {
          console.error('Error obteniendo likes del usuario:', error);
        }
      }

      // Mapear items en el orden correcto (mantener orden de intercalación)
      const feedItems: FeedItemDTO[] = [];
      let skippedProducts = 0;
      let skippedPosters = 0;
      const skipReasons: { [key: string]: number } = {
        'product_not_found': 0,
        'product_no_title': 0,
        'product_no_image': 0,
        'poster_not_found': 0,
      };

      for (const item of intercalated.items) {
      if (item.itemType === 'product') {
        const product = productMap.get(item.itemId);
        if (!product) {
          skipReasons['product_not_found']++;
          skippedProducts++;
          console.warn(`⚠️ [FEED-SERVICE] Producto ${item.itemId} no encontrado en productMap, omitiendo`);
          continue; // Saltar si no se encontró el producto
        }
        
        // ✅ VALIDAR: Verificar que tenga title
        if (!product.title || product.title.trim() === '') {
          skipReasons['product_no_title']++;
          skippedProducts++;
          console.warn(`⚠️ [FEED-SERVICE] Producto ${product.id} no tiene title o está vacío, omitiendo`);
          continue;
        }
        
        const firstVariant = product.variants[0];
        
        // ✅ MEJORAR: Extraer imágenes de forma robusta (campo JSON puede venir en diferentes formatos)
        let imagesArray: string[] = [];
        if (product.images) {
          if (Array.isArray(product.images)) {
            // Si es array, extraer strings directamente o desde objetos
            imagesArray = product.images.map((img: any) => {
              if (typeof img === 'string') return img;
              if (typeof img === 'object' && img !== null) {
                return img.url || img.urlS3 || img;
              }
              return img;
            }).filter((img: any) => img && typeof img === 'string');
          } else if (typeof product.images === 'string') {
            // Si es string, intentar parsear como JSON
            try {
              const parsed = JSON.parse(product.images);
              if (Array.isArray(parsed)) {
                imagesArray = parsed.filter((img: any) => typeof img === 'string');
              }
            } catch (e) {
              // No es JSON válido, ignorar
            }
          }
        }
        
        // Obtener primera imagen válida
        const firstImage = imagesArray.length > 0 ? imagesArray[0] : null;
        let imageUrl = firstImage ? (this.normalizeImageUrl(firstImage) || '') : '';
        
        // ✅ MEJORAR: Si no hay imagen, dejar cadena vacía para que el frontend lo maneje
        // Las imágenes se agregarán cuando se ejecute ENRICH y SYNC
        if (!imageUrl || imageUrl.trim() === '') {
          imageUrl = ''; // Frontend manejará el placeholder
        }
        
        // Usar tankuPrice directamente (ya calculado en sync)
        const finalPrice = firstVariant?.tankuPrice || undefined;
        
        // Obtener likesCount e isLiked
        const metrics = itemMetricsMap.get(product.id);
        const likesCount = metrics?.likesCount || 0;
        const isLiked = userId ? userLikedProductsSet.has(product.id) : false;
        
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
          likesCount,
          isLiked,
        });
      } else {
        const poster = posterMap.get(item.itemId);
        if (!poster) {
          skipReasons['poster_not_found']++;
          skippedPosters++;
          console.warn(`⚠️ [FEED-SERVICE] Poster ${item.itemId} no encontrado en posterMap, omitiendo`);
          continue; // Saltar si no se encontró el poster
        }
        
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

      // Resumen solo si hay problemas
      if (skippedProducts > 0 || skippedPosters > 0) {
        console.warn(`⚠️ [FEED] Items omitidos: ${skippedProducts} productos, ${skippedPosters} posters`);
      }

      // Crear cursor híbrido para siguiente página
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
   * Filtra por amigos + propio si se proporciona userId
   */
  private async getPostsByDate(
    cursor: FeedCursorDTO | undefined,
    limit: number,
    userId?: string
  ) {
    const where: any = {
      isActive: true,
    };

    // Si hay userId, filtrar por amigos + propio y excluir bloqueados
    if (userId) {
      try {
        // Obtener lista de amigos aceptados (bidireccional)
        const friends = await prisma.friend.findMany({
          where: {
            OR: [
              { userId, status: 'accepted' },
              { friendId: userId, status: 'accepted' }
            ]
          },
          select: {
            userId: true,
            friendId: true,
          }
        });

        // Extraer IDs de amigos (bidireccional) + incluir el usuario mismo
        const friendIds = new Set<string>([userId]); // Incluir el usuario mismo
        friends.forEach(f => {
          if (f.userId === userId) friendIds.add(f.friendId);
          if (f.friendId === userId) friendIds.add(f.userId);
        });

        // Obtener IDs de usuarios bloqueados (que el usuario bloqueó)
        const blockedUserIds = await prisma.friend.findMany({
          where: {
            userId,
            status: 'blocked',
          },
          select: {
            friendId: true,
          },
        });

        // Obtener IDs de usuarios que bloquearon al usuario actual
        const blockedByUserIds = await prisma.friend.findMany({
          where: {
            friendId: userId,
            status: 'blocked',
          },
          select: {
            userId: true,
          },
        });

        // Combinar todos los IDs bloqueados (bidireccional)
        const allBlockedIds = new Set<string>([
          ...blockedUserIds.map(b => b.friendId),
          ...blockedByUserIds.map(b => b.userId),
        ]);

        // Excluir usuarios bloqueados de los friendIds
        allBlockedIds.forEach(blockedId => {
          friendIds.delete(blockedId);
        });

        // Si hay cursor, combinar con filtro de amigos (sin bloqueados)
        if (cursor?.lastPostCreatedAt) {
          where.AND = [
            {
              customerId: { in: Array.from(friendIds) },
            },
            {
              OR: [
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
              ],
            },
          ];
        } else {
          // Sin cursor, solo filtrar por amigos (sin bloqueados)
          where.customerId = { in: Array.from(friendIds) };
        }
      } catch (friendsError: any) {
        // Si hay error obteniendo amigos, continuar sin filtro (fallback)
        console.warn(`⚠️ [FEED-SERVICE] Error obteniendo amigos para filtrar posters:`, friendsError?.message);
        // Si hay cursor, aplicarlo normalmente
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
      }
    } else {
      // Sin userId, aplicar cursor normalmente si existe
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
      // Contar cuántos productos consecutivos hemos insertado (sin contar posters intermedios)
      // Necesitamos contar desde el último poster o desde el inicio
      let consecutiveProducts = 0;
      for (let i = intercalated.length - 1; i >= 0; i--) {
        if (intercalated[i].itemType === 'poster') {
          break; // Detener al encontrar el último poster
        }
        if (intercalated[i].itemType === 'product') {
          consecutiveProducts++;
        }
      }
      
      // Si ya insertamos 5 productos consecutivos (postsPerProducts), insertar 1 poster
      // Pero solo si hay posts disponibles y no es el primer item
      const shouldInsertPost = intercalated.length > 0 && 
        consecutiveProducts >= postsPerProducts && 
        postIndex < posts.length;

      if (shouldInsertPost) {
        // Insertar post después de cada grupo de 5 productos
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
    // Fórmula actualizada: orders * 8 + wishlist * 4 + comments * 3 + likes * 1
    // Compra manda (orders), intención fuerte (wishlist), engagement real (comments), popularidad suave (likes)
    const globalScore =
      metrics.ordersCount * 8 +        // compra manda
      metrics.wishlistCount * 4 +      // intención fuerte
      metrics.commentsCount * 3 +      // engagement real
      metrics.likesCount * 1;          // popularidad suave (habrán muchos likes)

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
    // ✅ VALIDAR: Para productos, verificar que tengan título e imágenes válidos
    if (itemType === 'product') {
      const product = await prisma.product.findUnique({
        where: { id: itemId },
        select: {
          title: true,
          images: true,
          active: true,
        },
      });

      if (!product) {
        console.warn(`[FEED-SERVICE] Producto ${itemId} no encontrado, omitiendo inicialización de métricas`);
        return;
      }

      // Validar que tenga título válido
      const hasValidTitle = product.title && 
                           product.title.trim() !== '' && 
                           product.title !== 'Sin nombre';
      
      // Validar que tenga imágenes
      const hasValidImages = product.images && 
                            Array.isArray(product.images) && 
                            product.images.length > 0;

      if (!hasValidTitle || !hasValidImages || !product.active) {
        console.warn(`[FEED-SERVICE] Producto ${itemId} no cumple requisitos para ranking (title: ${hasValidTitle}, images: ${hasValidImages}, active: ${product.active}), omitiendo`);
        return; // No agregar al ranking si no cumple requisitos
      }
    }

    // Inicializar métricas (siempre, incluso si no se agrega al ranking)
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

    // Solo agregar al ranking si es producto válido o es poster
    if (itemType === 'product') {
      // Ya validamos arriba, así que podemos agregar
      const product = await prisma.product.findUnique({
        where: { id: itemId },
        select: { createdAt: true },
      });
      const createdAt = product?.createdAt || new Date();

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
          globalScore: 1, // ✅ Cambiar de 0 a 1 para que aparezcan en el feed
          createdAt,
        },
      });
    } else {
      // Para posters, mantener lógica original
      const poster = await prisma.poster.findUnique({
        where: { id: itemId },
        select: { createdAt: true },
      });
      const createdAt = poster?.createdAt || new Date();

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
          globalScore: 0, // Posters mantienen 0
          createdAt,
        },
      });
    }
  }
}

