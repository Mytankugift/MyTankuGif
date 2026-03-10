import { prisma } from '../../config/database';
import { FeedItemDTO, FeedCursorDTO, FeedResponseDTO } from '../../shared/dto/feed.dto';
import { Prisma } from '@prisma/client';
import type { Product, ProductVariant, Category, Poster, User, UserProfile } from '@prisma/client';
import { getBlockedCategoryIds, getAllChildrenIds } from '../../shared/utils/category.utils';

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
  private readonly MAX_BOOST_ENTRIES = 10000; // Límite máximo de boosts en memoria

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
  private readonly MAX_CURSOR_TOKENS = 10000; // Límite máximo de tokens en memoria

  // CONFIGURACIÓN HARDCODEADA
  private readonly DEFAULT_LIMIT = 50;
  private readonly DEFAULT_POSTS_PER_PRODUCTS = 5;

  // CACHE PARA FEED PÚBLICO
  private publicFeedCache: {
    data: FeedResponseDTO | null;
    timestamp: number;
    categoryId?: string;
    search?: string;
  } | null = null;
  private readonly PUBLIC_FEED_CACHE_TTL = 60000; // 60 segundos

  // CACHE PARA CATEGORÍAS BLOQUEADAS
  private blockedCategoryIdsCache: string[] | null = null;
  private blockedCategoryIdsCacheTime: number = 0;
  private readonly BLOCKED_CATEGORIES_TTL = 3600000; // 1 hora en ms

  // ✅ CACHE PARA IDs DE HIJOS DE CATEGORÍAS (optimizar getAllChildrenIds)
  private categoryChildrenCache: Map<string, { ids: string[]; timestamp: number }> = new Map();
  private readonly CATEGORY_CHILDREN_TTL = 3600000; // 1 hora en ms

  // ✅ Para evitar spam de warnings de ranking
  private lastRankingWarningTime: number = 0;

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
      
      // ✅ Ejecutar queries independientes en paralelo para mejor performance
      const [productsResult, postsResult, blockedCategoryIds] = await Promise.all([
        // Obtener productos por ranking o búsqueda (solo productos)
        (async () => {
          try {
            // Si hay búsqueda, usar método de búsqueda que busca en todos los productos
            if (search && search.trim()) {
              return await this.getProductsBySearch(
                search.trim(),
                cursor,
                estimatedProducts + 5, // Buffer extra para asegurar suficientes productos
                categoryId
              );
            } else {
              return await this.getProductsByRanking(
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
              return [];
            } else {
              console.error(`❌ [FEED-SERVICE] Error obteniendo productos:`, productsError?.message);
              console.error(`❌ [FEED-SERVICE] Stack:`, productsError?.stack);
              // Continuar con array vacío en lugar de fallar completamente
              return [];
            }
          }
        })(),
        // Obtener posts por fecha (solo posts, filtrados por amigos + propio si hay userId)
        (async () => {
          try {
            return await this.getPostsByDate(
              cursor,
              estimatedPosts + 2, // Buffer extra
              userId // Pasar userId para filtrar por amigos + propio
            );
          } catch (postsError: any) {
            console.error(`❌ [FEED-SERVICE] Error obteniendo posts:`, postsError?.message);
            console.error(`❌ [FEED-SERVICE] Stack:`, postsError?.stack);
            // Continuar con array vacío en lugar de fallar completamente
            return [];
          }
        })(),
        // Obtener categorías bloqueadas (con cache)
        this.getBlockedCategoryIdsCached()
      ]);

      const products = productsResult;
      const posts = postsResult;

      // Intercalar productos y posts según la regla
      const intercalated = this.intercalateItems(products, posts, limit, postsPerProducts);

      // Separar productos y posters para batch queries
      const productIds = intercalated.items
        .filter(item => item.itemType === 'product')
        .map(item => item.itemId);
      
      const posterIds = intercalated.items
        .filter(item => item.itemType === 'poster')
        .map(item => item.itemId);


      // ✅ PARALELIZAR: Ejecutar todas las batch queries en paralelo
      const [
        productsDataResult,
        postersDataResult,
        metricsResult,
        userLikesResult,
        wishlistItemsResult
      ] = await Promise.all([
        // Batch query para productos (una sola query en lugar de N queries)
        (async () => {
          try {
            if (productIds.length > 0) {
              // ✅ Usar categorías bloqueadas ya obtenidas en paralelo
              // ✅ OPTIMIZAR: Usar select en lugar de include para reducir datos transferidos
              return await prisma.product.findMany({
                where: { 
                  id: { in: productIds },
                  // Excluir productos de categorías bloqueadas
                  ...(blockedCategoryIds.length > 0 && {
                    categoryId: {
                      notIn: blockedCategoryIds,
                    },
                  }),
                },
                select: {
                  id: true,
                  title: true,
                  handle: true,
                  description: true,
                  images: true,
                  customImageUrls: true,
                  hiddenImages: true,
                  categoryId: true,
                  active: true,
                  createdAt: true,
                  updatedAt: true,
                  lockedByAdmin: true,
                  lockedAt: true,
                  lockedBy: true,
                  priceFormulaType: true,
                  priceFormulaValue: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                      handle: true,
                      imageUrl: true,
                    }
                  },
                  variants: {
                    where: { active: true },
                    orderBy: { price: 'asc' },
                    take: 1,
                    select: {
                      id: true,
                      productId: true,
                      sku: true,
                      title: true,
                      price: true,
                      stock: true,
                      active: true,
                      suggestedPrice: true,
                      tankuPrice: true,
                    }
                  },
                },
              });
            }
            return [];
          } catch (productsDataError: any) {
            console.error(`❌ [FEED-SERVICE] Error en batch query de productos:`, productsDataError?.message);
            console.error(`❌ [FEED-SERVICE] Stack:`, productsDataError?.stack);
            return [];
          }
        })(),
        // Batch query para posters (una sola query en lugar de N queries)
        (async () => {
          try {
            if (posterIds.length > 0) {
              return await prisma.poster.findMany({
                where: { id: { in: posterIds } },
                select: {
                  id: true,
                  customerId: true,
                  title: true,
                  description: true,
                  imageUrl: true,
                  videoUrl: true,
                  likesCount: true,
                  commentsCount: true,
                  isActive: true,
                  createdAt: true,
                  updatedAt: true,
                  customer: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true,
                      lastName: true,
                      username: true,
                      profile: {
                        select: {
                          avatar: true,
                          banner: true,
                          bio: true,
                        }
                      },
                    },
                  },
                },
              });
            }
            return [];
          } catch (postersDataError: any) {
            console.error(`❌ [FEED-SERVICE] Error en batch query de posters:`, postersDataError?.message);
            console.error(`❌ [FEED-SERVICE] Stack:`, postersDataError?.stack);
            return [];
          }
        })(),
        // Batch query para métricas de likes (en paralelo)
        (async () => {
          try {
            if (productIds.length > 0) {
              const metrics = await (prisma as any).itemMetric.findMany({
                where: {
                  itemId: { in: productIds },
                  itemType: 'product',
                },
                select: {
                  itemId: true,
                  likesCount: true,
                },
              });
              return metrics;
            }
            return [];
          } catch (error) {
            console.error('Error obteniendo métricas de likes:', error);
            return [];
          }
        })(),
        // Batch query para likes del usuario (en paralelo)
        (async () => {
          try {
            if (userId && productIds.length > 0) {
              const userLikes = await prisma.productLike.findMany({
                where: {
                  userId,
                  productId: { in: productIds },
                },
                select: {
                  productId: true,
                },
              });
              return userLikes;
            }
            return [];
          } catch (error) {
            console.error('Error obteniendo likes del usuario:', error);
            return [];
          }
        })(),
        // Batch query para wishlist del usuario (en paralelo)
        (async () => {
          try {
            if (userId && productIds.length > 0) {
              const wishlistItems = await prisma.wishListItem.findMany({
                where: {
                  wishList: {
                    userId,
                  },
                  productId: { in: productIds },
                },
                select: {
                  productId: true,
                },
                distinct: ['productId'], // Solo productos únicos
              });
              return wishlistItems;
            }
            return [];
          } catch (error) {
            console.error('Error obteniendo productos en wishlists del usuario:', error);
            return [];
          }
        })()
      ]);

      const productsData = productsDataResult;
      const postersData = postersDataResult;

      // Crear mapas para acceso rápido O(1)
      const productMap = new Map(productsData.map(p => [p.id, p]));
      const posterMap = new Map(postersData.map(p => [p.id, p]));

      // ✅ FILTRAR productos del ranking que no existen en BD ANTES de procesarlos
      // Esto evita warnings y asegura que solo procesamos productos válidos
      const validProductIds = new Set(productMap.keys());
      const missingProducts: string[] = [];
      const productItems = intercalated.items.filter(item => item.itemType === 'product');
      for (const item of productItems) {
        if (!validProductIds.has(item.itemId)) {
          missingProducts.push(item.itemId);
        }
      }
      
      // Solo loggear si hay muchos productos faltantes (más de 10% del total)
      // Y solo una vez cada 5 minutos para evitar spam de logs
      if (missingProducts.length > 0 && missingProducts.length > productItems.length * 0.10) {
        const now = Date.now();
        const timeSinceLastWarning = now - this.lastRankingWarningTime;
        if (timeSinceLastWarning > 300000) { // 5 minutos = 300000 ms
          this.lastRankingWarningTime = now;
          console.warn(`⚠️ [FEED-SERVICE] ${missingProducts.length} productos en ranking no encontrados en BD (de ${productItems.length} productos en ranking)`);
          console.warn(`⚠️ [FEED-SERVICE] Esto puede indicar un problema de sincronización. Considerar limpiar el ranking.`);
          console.warn(`⚠️ [FEED-SERVICE] Primeros 10 IDs faltantes:`, missingProducts.slice(0, 10));
        }
      }
      
      // Filtrar items intercalados para excluir productos que no existen en BD
      const validIntercalatedItems = intercalated.items.filter(item => {
        if (item.itemType === 'product') {
          return validProductIds.has(item.itemId);
        }
        return true; // Mantener todos los posters
      });
      
      // Actualizar intercalated con solo items válidos
      intercalated.items = validIntercalatedItems;

      // ✅ Procesar resultados de queries paralelas
      const productIdsForMetrics = Array.from(productMap.keys());
      
      // Procesar métricas de likes
      const itemMetricsMap = new Map<string, { likesCount: number }>();
      (metricsResult as any[]).forEach((m: any) => {
        itemMetricsMap.set(m.itemId, { likesCount: m.likesCount || 0 });
      });

      // Procesar likes del usuario
      const userLikedProductsSet = new Set<string>();
      (userLikesResult as any[]).forEach((like: any) => {
        userLikedProductsSet.add(like.productId);
      });

      // Procesar wishlist del usuario
      const userWishlistProductsSet = new Set<string>();
      (wishlistItemsResult as any[]).forEach((item: any) => {
        userWishlistProductsSet.add(item.productId);
      });

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
        
        // ✅ Verificar que variants exista y tenga elementos
        const firstVariant = (product.variants && product.variants.length > 0) ? product.variants[0] : null;
        
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
        
        // ✅ Filtrar imágenes bloqueadas
        const hiddenImages = (product.hiddenImages || []) as string[];
        imagesArray = imagesArray.filter(img => !hiddenImages.includes(img));
        
        // Obtener primera imagen válida
        const firstImage = imagesArray.length > 0 ? imagesArray[0] : null;
        let imageUrl = firstImage ? (this.normalizeImageUrl(firstImage) || '') : '';
        
        // ✅ MEJORAR: Si no hay imagen, dejar cadena vacía para que el frontend lo maneje
        // Las imágenes se agregarán cuando se ejecute ENRICH y SYNC
        if (!imageUrl || imageUrl.trim() === '') {
          imageUrl = ''; // Frontend manejará el placeholder
        }
        
        // ✅ Usar tankuPrice directamente (ya calculado en sync) o price como fallback
        const finalPrice = firstVariant?.tankuPrice || firstVariant?.price || undefined;
        
        // Obtener likesCount, isLiked e isInWishlist
        const metrics = itemMetricsMap.get(product.id);
        const likesCount = metrics?.likesCount || 0;
        const isLiked = userId ? userLikedProductsSet.has(product.id) : false;
        const isInWishlist = userId ? userWishlistProductsSet.has(product.id) : false;
        
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
          isInWishlist,
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
    // Limpiar tokens expirados primero
    this.cleanExpiredTokens();
    
    // Si hay demasiados tokens, eliminar los más antiguos (FIFO)
    if (this.cursorTokens.size >= this.MAX_CURSOR_TOKENS) {
      const firstToken = this.cursorTokens.keys().next().value;
      if (firstToken) {
        this.cursorTokens.delete(firstToken);
      }
    }
    
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
   * Obtener categorías bloqueadas con cache (TTL de 1 hora)
   */
  private async getBlockedCategoryIdsCached(): Promise<string[]> {
    const now = Date.now();
    if (this.blockedCategoryIdsCache && (now - this.blockedCategoryIdsCacheTime) < this.BLOCKED_CATEGORIES_TTL) {
      return this.blockedCategoryIdsCache;
    }
    
    this.blockedCategoryIdsCache = await getBlockedCategoryIds();
    this.blockedCategoryIdsCacheTime = now;
    return this.blockedCategoryIdsCache;
  }

  /**
   * ✅ OPTIMIZAR: Obtener IDs de hijos de categoría con cache
   * Evita queries recursivas repetidas
   */
  private async getAllChildrenIdsCached(categoryId: string): Promise<string[]> {
    const now = Date.now();
    const cached = this.categoryChildrenCache.get(categoryId);
    
    if (cached && (now - cached.timestamp) < this.CATEGORY_CHILDREN_TTL) {
      return cached.ids;
    }
    
    const ids = await getAllChildrenIds(categoryId);
    this.categoryChildrenCache.set(categoryId, { ids, timestamp: now });
    
    // ✅ Limpiar cache si crece demasiado (evitar memory leak)
    if (this.categoryChildrenCache.size > 1000) {
      const oldestKey = this.categoryChildrenCache.keys().next().value;
      if (oldestKey) {
        this.categoryChildrenCache.delete(oldestKey);
      }
    }
    
    return ids;
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
    // Obtener IDs de categorías bloqueadas (con cache)
    const blockedCategoryIds = await this.getBlockedCategoryIdsCached();
    
    // Verificar si la categoría solicitada está bloqueada
    if (categoryId && blockedCategoryIds.includes(categoryId)) {
      // La categoría está bloqueada, retornar vacío
      return [];
    }
    
    // Primero obtener IDs de productos de la categoría si se especifica
    let productIds: string[] | undefined;
    if (categoryId) {
      // Obtener la categoría para verificar si tiene hijos
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, parentId: true },
      });
      
      if (!category) {
        // La categoría no existe
        return [];
      }
      
      // ✅ Obtener todos los IDs de subcategorías (hijos) con cache
      const childrenIds = await this.getAllChildrenIdsCached(categoryId);
      
      // Buscar productos en la categoría padre Y en todas sus subcategorías
      const categoryIdsToSearch = [categoryId, ...childrenIds];
      
      const productsInCategory = await prisma.product.findMany({
        where: { 
          categoryId: {
            in: categoryIdsToSearch,
          },
        },
        select: { id: true },
      });
      productIds = productsInCategory.map(p => p.id);
      
      if (productIds.length === 0) {
        // No hay productos en esta categoría ni en sus subcategorías
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
    
    // Filtro por categoría si se especifica (incluyendo subcategorías)
    if (categoryId) {
      // Obtener todos los IDs de subcategorías
      const childrenIds = await getAllChildrenIds(categoryId);
      const categoryIdsToSearch = [categoryId, ...childrenIds];
      
      conditions.push({ 
        categoryId: {
          in: categoryIdsToSearch,
        }
      });
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
    
    // Obtener IDs de productos que están en el ranking global (solo estos son válidos para mostrar)
    const productsInRanking = await (prisma as any).globalRanking.findMany({
      where: {
        itemType: 'product',
      },
      select: { itemId: true },
    });

    const validProductIds = new Set(productsInRanking.map((r: any) => r.itemId));

    if (validProductIds.size === 0) {
      // No hay productos válidos en el ranking
      return [];
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

    // IMPORTANTE: Solo productos que están en el ranking global (cumplen requisitos)
    where.id = {
      in: Array.from(validProductIds),
    };

    // También filtrar por active: true
    where.active = true;
    
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
        // ✅ PARALELIZAR: Obtener amigos y bloqueados en paralelo (3 queries → 1 Promise.all)
        const [friends, blockedUserIds, blockedByUserIds] = await Promise.all([
          // Obtener lista de amigos aceptados (bidireccional)
          prisma.friend.findMany({
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
          }),
          // Obtener IDs de usuarios bloqueados (que el usuario bloqueó)
          prisma.friend.findMany({
            where: {
              userId,
              status: 'blocked',
            },
            select: {
              friendId: true,
            },
          }),
          // Obtener IDs de usuarios que bloquearon al usuario actual
          prisma.friend.findMany({
            where: {
              friendId: userId,
              status: 'blocked',
            },
            select: {
              userId: true,
            },
          })
        ]);

        // Extraer IDs de amigos (bidireccional) + incluir el usuario mismo
        const friendIds = new Set<string>([userId]); // Incluir el usuario mismo
        friends.forEach(f => {
          if (f.userId === userId) friendIds.add(f.friendId);
          if (f.friendId === userId) friendIds.add(f.userId);
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
    // Si hay demasiados boosts, eliminar el más antiguo (FIFO)
    if (this.boostMap.size >= this.MAX_BOOST_ENTRIES) {
      const firstKey = this.boostMap.keys().next().value;
      if (firstKey) {
        this.boostMap.delete(firstKey);
      }
    }
    
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
   * Recalcular ranking para un item
   * Método público para poder llamarlo desde otros servicios
   */
  async recalculateRankingForItem(
    itemId: string,
    itemType: 'product' | 'poster'
  ): Promise<void> {
    await this.recalculateRanking(itemId, itemType);
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
    // ✅ VALIDAR: Para productos, verificar que tengan título, imágenes, active Y stock >= 30
    if (itemType === 'product') {
      const product = await prisma.product.findUnique({
        where: { id: itemId },
        select: {
          title: true,
          images: true,
          hiddenImages: true,
          active: true,
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
        console.warn(`[FEED-SERVICE] Producto ${itemId} no encontrado, omitiendo inicialización de métricas`);
        return;
      }

      // Validar que tenga título válido
      const hasValidTitle = product.title && 
                           product.title.trim() !== '' && 
                           product.title !== 'Sin nombre';
      
      // Validar que tenga imágenes visibles (filtrar bloqueadas)
      const hiddenImages = product.hiddenImages || [];
      const visibleImages = (product.images || []).filter(img => !hiddenImages.includes(img));
      const hasValidImages = Array.isArray(visibleImages) && visibleImages.length > 0;

      // Calcular stock total
      const MIN_STOCK_THRESHOLD = 30;
      const totalStock = product.variants.reduce((total, variant) => {
        const variantStock = variant.warehouseVariants?.reduce(
          (sum, wv) => sum + (wv.stock || 0),
          0
        ) || 0;
        return total + variantStock;
      }, 0);

      const hasEnoughStock = totalStock >= MIN_STOCK_THRESHOLD;

      if (!hasValidTitle || !hasValidImages || !product.active || !hasEnoughStock) {
        console.warn(`[FEED-SERVICE] Producto ${itemId} no cumple requisitos para ranking (title: ${hasValidTitle}, images: ${hasValidImages}, active: ${product.active}, stock: ${totalStock} < ${MIN_STOCK_THRESHOLD}), omitiendo`);
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

  /**
   * Obtener feed público (solo productos, sin posters, sin autenticación)
   * Cacheable y limitado a 100 productos máximo
   * 
   * @param cursorToken Token del cursor (opcional, para paginación)
   * @param categoryId ID de categoría para filtrar (opcional)
   * @param search Query de búsqueda para filtrar productos (opcional)
   */
  async getPublicFeed(
    cursorToken?: string,
    categoryId?: string,
    search?: string
  ): Promise<FeedResponseDTO> {
    try {
      // Verificar cache primero
      const cacheKey = this.getPublicFeedCacheKey(categoryId, search);
      const now = Date.now();
      
      if (this.publicFeedCache && 
          this.publicFeedCache.categoryId === categoryId &&
          this.publicFeedCache.search === search &&
          (now - this.publicFeedCache.timestamp) < this.PUBLIC_FEED_CACHE_TTL &&
          !cursorToken) { // Solo usar cache si no hay cursor (primera página)
        return this.publicFeedCache.data || { items: [], nextCursorToken: null };
      }

      // Limpiar tokens expirados
      this.cleanExpiredTokens();

      // Obtener cursor del token si existe
      const cursor = cursorToken ? this.getCursorFromToken(cursorToken) : undefined;

      // Límite máximo para feed público: 100 productos total
      const PUBLIC_FEED_MAX_PRODUCTS = 100;
      // Si no hay cursor, devolver todos los 100 productos de una vez
      // Si hay cursor, ya estamos en segunda página, no debería haber más productos
      const limit = cursorToken ? 0 : PUBLIC_FEED_MAX_PRODUCTS;

      // Obtener productos por ranking o búsqueda (solo productos, sin boost)
      // Para feed público sin cursor, pedir suficientes productos para asegurar 100 válidos
      let products: any[] = [];
      try {
        if (search && search.trim()) {
          // Para búsqueda, pedir más productos para compensar filtros
          products = await this.getProductsBySearch(
            search.trim(),
            cursor,
            limit > 0 ? limit + 100 : 0, // Buffer grande para compensar filtros
            categoryId
          );
        } else {
          // Para ranking, pedir más productos para asegurar 100 válidos
          products = await this.getProductsByRanking(
            cursor,
            limit > 0 ? limit + 100 : 0, // Buffer grande para compensar filtros
            1.0, // Sin boost (boostFactor = 1.0)
            categoryId
          );
        }
      } catch (productsError: any) {
        if (productsError?.code === 'P2021' || productsError?.message?.includes('does not exist')) {
          console.warn(`⚠️ [FEED-SERVICE] Tabla global_ranking no existe. Retornando feed vacío.`);
          products = [];
        } else {
          console.error(`❌ [FEED-SERVICE] Error obteniendo productos para feed público:`, productsError?.message);
          products = [];
        }
      }

      // No limitar aquí, procesaremos hasta tener 100 válidos

      // Obtener IDs de productos para batch query
      const productIds = products.map(item => item.itemId);

      // Batch query para productos
      let productsData: any[] = [];
      try {
        if (productIds.length > 0) {
          // ✅ Usar categorías bloqueadas con cache
          const blockedCategoryIds = await this.getBlockedCategoryIdsCached();
          
          productsData = await prisma.product.findMany({
            where: { 
              id: { in: productIds },
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
                take: 1,
              },
            },
          });
        }
      } catch (productsDataError: any) {
        console.error(`❌ [FEED-SERVICE] Error en batch query de productos (feed público):`, productsDataError?.message);
        productsData = [];
      }

      // Crear mapa para acceso rápido
      const productMap = new Map(productsData.map(p => [p.id, p]));

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
        } catch (metricsError: any) {
          console.warn(`⚠️ [FEED-SERVICE] Error obteniendo métricas (feed público):`, metricsError?.message);
        }
      }

      // Mapear productos a FeedItemDTO (sin isLiked ya que no hay userId)
      // Continuar hasta tener 100 productos válidos
      const feedItems: FeedItemDTO[] = [];
      let currentCursor: FeedCursorDTO | undefined = cursor;
      let allProducts = [...products];
      let processedIndex = 0;
      
      // Loop para asegurar que siempre tengamos 100 productos válidos
      while (feedItems.length < PUBLIC_FEED_MAX_PRODUCTS) {
        // Procesar productos disponibles
        while (processedIndex < allProducts.length && feedItems.length < PUBLIC_FEED_MAX_PRODUCTS) {
          const item = allProducts[processedIndex];
          processedIndex++;
          
          const product = productMap.get(item.itemId);
          if (!product) {
            continue; // Saltar si no se encontró el producto
          }

          const firstVariant = product.variants[0];
          
          // Extraer imágenes
          let imagesArray: string[] = [];
          if (product.images) {
            if (Array.isArray(product.images)) {
              imagesArray = product.images.map((img: any) => {
                if (typeof img === 'string') return img;
                if (typeof img === 'object' && img !== null) {
                  return img.url || img.urlS3 || img;
                }
                return img;
              }).filter((img: any) => img && typeof img === 'string');
            } else if (typeof product.images === 'string') {
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
          
          // Filtrar imágenes bloqueadas
          const hiddenImages = (product.hiddenImages || []) as string[];
          imagesArray = imagesArray.filter(img => !hiddenImages.includes(img));
          
          // Obtener primera imagen válida
          const firstImage = imagesArray.length > 0 ? imagesArray[0] : null;
          let imageUrl = firstImage ? (this.normalizeImageUrl(firstImage) || '') : '';
          
          if (!imageUrl || imageUrl.trim() === '') {
            imageUrl = ''; // Frontend manejará el placeholder
          }
          
          // Verificar que el producto tenga título (requerido)
          if (!product.title || product.title.trim() === '') {
            continue; // Saltar productos sin título
          }
          
          // Usar tankuPrice directamente
          const finalPrice = firstVariant?.tankuPrice || undefined;
          
          // Obtener likesCount (sin isLiked ya que no hay userId)
          const metrics = itemMetricsMap.get(product.id);
          const likesCount = metrics?.likesCount || 0;
          
          feedItems.push({
            id: product.id,
            type: 'product',
            createdAt: product.createdAt.toISOString(),
            title: product.title,
            imageUrl,
            price: finalPrice,
            handle: product.handle,
            category: product.category ? {
              id: product.category.id,
              name: product.category.name,
              handle: product.category.handle,
            } : undefined,
            likesCount,
            // No incluir isLiked (requiere userId)
          });
        }
        
        // Si aún no tenemos 100 productos y no hay cursor (primera carga), pedir más
        if (feedItems.length < PUBLIC_FEED_MAX_PRODUCTS && !cursorToken && processedIndex >= allProducts.length) {
          try {
            // Crear cursor desde el último producto procesado
            if (allProducts.length > 0) {
              const lastProduct = allProducts[allProducts.length - 1];
              const createdAt = lastProduct.createdAt instanceof Date 
                ? lastProduct.createdAt.toISOString()
                : (lastProduct.createdAt ? new Date(lastProduct.createdAt).toISOString() : undefined);
              currentCursor = {
                lastProductScore: lastProduct.globalScore,
                lastProductCreatedAt: createdAt,
                lastProductId: lastProduct.itemId,
                lastItemType: 'product',
              };
            }
            
            // Obtener más productos del ranking
            const additionalProducts = await this.getProductsByRanking(
              currentCursor,
              50, // Pedir 50 más
              1.0,
              categoryId
            );
            
            if (additionalProducts.length === 0) {
              // No hay más productos disponibles
              break;
            }
            
            // Agregar los nuevos productos a la lista
            allProducts = [...allProducts, ...additionalProducts];
            
            // Obtener los nuevos IDs y hacer batch query
            const newProductIds = additionalProducts.map(item => item.itemId);
            if (newProductIds.length > 0) {
              const blockedCategoryIds = await getBlockedCategoryIds();
              const newProductsData = await prisma.product.findMany({
                where: { 
                  id: { in: newProductIds },
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
                    take: 1,
                  },
                },
              });
              
              // Agregar al mapa
              newProductsData.forEach(p => productMap.set(p.id, p));
              
              // Actualizar métricas
              const newMetrics = await (prisma as any).itemMetric.findMany({
                where: {
                  itemId: { in: newProductIds },
                  itemType: 'product',
                },
                select: {
                  itemId: true,
                  likesCount: true,
                },
              });
              newMetrics.forEach((m: any) => {
                itemMetricsMap.set(m.itemId, { likesCount: m.likesCount || 0 });
              });
            }
          } catch (error: any) {
            console.error(`❌ [FEED-SERVICE] Error obteniendo productos adicionales:`, error?.message);
            break; // Salir del loop si hay error
          }
        } else {
          // Ya procesamos todos los productos disponibles o hay cursor (paginación)
          break;
        }
      }

      // Crear cursor para siguiente página (solo productos)
      // No crear cursor para feed público ya que siempre devolvemos los 100 productos completos en la primera carga
      let nextCursor: FeedCursorDTO | null = null;
      // El feed público siempre devuelve 100 productos en la primera carga, sin paginación
      // No hay más páginas después de los 100 productos

      // Generar token para siguiente página si hay más items
      const nextCursorToken = nextCursor ? this.generateCursorToken(nextCursor) : null;

      const result: FeedResponseDTO = {
        items: feedItems,
        nextCursorToken,
      };

      // Guardar en cache (solo primera página, sin cursor)
      if (!cursorToken) {
        this.publicFeedCache = {
          data: result,
          timestamp: now,
          categoryId,
          search,
        };
      }

      return result;
    } catch (error: any) {
      console.error(`❌ [FEED-SERVICE] Error en getPublicFeed:`, error?.message);
      console.error(`❌ [FEED-SERVICE] Stack:`, error?.stack);
      
      return {
        items: [],
        nextCursorToken: null,
      };
    }
  }

  /**
   * Generar clave de cache para feed público
   */
  private getPublicFeedCacheKey(categoryId?: string, search?: string): string {
    const parts = ['feed_public_v1'];
    if (categoryId) parts.push(`cat_${categoryId}`);
    if (search) parts.push(`search_${search.trim().toLowerCase()}`);
    return parts.join('_');
  }

  /**
   * Invalidar cache del feed público
   * Llamar cuando se actualiza el ranking o se agrega/elimina un producto
   */
  invalidatePublicFeedCache(): void {
    this.publicFeedCache = null;
  }
}

