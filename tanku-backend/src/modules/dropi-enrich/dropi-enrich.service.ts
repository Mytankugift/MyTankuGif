import { prisma } from '../../config/database';
import { DropiService } from '../dropi/dropi.service';

export class DropiEnrichService {
  private dropiService: DropiService;

  constructor() {
    this.dropiService = new DropiService();
  }

  /**
   * Enriquecer productos con información detallada desde /products/v2/{id}
   * 
   * @param limit Máximo de productos a procesar (default: 1000)
   * @param priority "active" | "high_stock" | "all" (default: "active")
   * @param batchSize Número de productos a procesar en paralelo (default: 50)
   * @param force Si es true, enriquece incluso productos que ya tienen descripción (default: false)
   * @returns Estadísticas de enriquecimiento
   */
  async enrichProducts(
    limit: number = 1000,
    priority: 'active' | 'high_stock' | 'all' = 'active',
    batchSize: number = 50,
    force: boolean = false
  ): Promise<{
    success: boolean;
    message: string;
    enriched: number;
    errors: number;
    error_details: Array<{ dropi_id: number; error: string }>;
    total_pending?: number; // ✅ AGREGADO: Total de productos pendientes
    remaining?: number; // ✅ AGREGADO: Productos restantes por enriquecer
  }> {
    console.log(`\n🔍 [ENRICH] Iniciando enriquecimiento (limit: ${limit}, priority: ${priority}, force: ${force})`);

    try {
      // Buscar todos los productos
      const allProducts = await prisma.dropiProduct.findMany({
        orderBy: {
          createdAt: 'asc',
        },
      });

      // ✅ MEJORA 1: Filtrar PRIMERO los que necesitan enriquecimiento
      // Validar que NO tenga description E images (ambos deben estar presentes para omitir)
      let productsToEnrich = allProducts;
      let alreadyComplete = 0;
      
      if (!force) {
        const beforeFilter = allProducts.length;
        productsToEnrich = allProducts.filter((p) => {
          const hasDescription = p.description && p.descriptionSyncedAt;
          const hasImages = p.images && Array.isArray(p.images) && p.images.length > 0;
          // Solo omitir si tiene AMBOS (description e images)
          return !(hasDescription && hasImages);
        });
        alreadyComplete = beforeFilter - productsToEnrich.length;
      }

      // ✅ MEJORA 2: Evitar productos que fallaron recientemente
      // Si un producto tiene lastSyncedAt muy reciente pero no tiene description,
      // puede ser que falló recientemente (especialmente con 429)
      const RECENT_FAILURE_THRESHOLD = 1000 * 60 * 60; // 1 hora
      const beforeRecentFilter = productsToEnrich.length;
      productsToEnrich = productsToEnrich.filter((p) => {
        // Si no tiene description pero tiene lastSyncedAt reciente, probablemente falló
        if (!p.description && p.lastSyncedAt) {
          const timeSinceLastSync = Date.now() - p.lastSyncedAt.getTime();
          // Si se intentó hace menos de 1 hora y no tiene description, probablemente falló
          if (timeSinceLastSync < RECENT_FAILURE_THRESHOLD) {
            return false; // Omitir este producto por ahora
          }
        }
        return true;
      });
      const skippedRecentFailures = beforeRecentFilter - productsToEnrich.length;

      // ✅ MEJORA 3: Aplicar prioridad a los productos pendientes
      if (priority === 'high_stock') {
        productsToEnrich = productsToEnrich.sort((a, b) => {
          const stockA = a.stock || 0;
          const stockB = b.stock || 0;
          return stockB - stockA;
        });
      }

      // ✅ MEJORA 4: Seleccionar aleatoriamente en lugar de siempre los primeros
      // Mezclar el array aleatoriamente (Fisher-Yates shuffle)
      for (let i = productsToEnrich.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [productsToEnrich[i], productsToEnrich[j]] = [productsToEnrich[j], productsToEnrich[i]];
      }

      // Limitar cantidad DESPUÉS de filtrar y mezclar
      productsToEnrich = productsToEnrich.slice(0, limit);

      // ✅ AGREGADO: Guardar total pendiente para calcular progreso
      const totalPending = productsToEnrich.length;

      if (productsToEnrich.length === 0) {
        return {
          success: true,
          message: 'No hay productos pendientes de enriquecer',
          enriched: 0,
          errors: 0,
          error_details: [],
          total_pending: 0, // ✅ AGREGADO
          remaining: 0, // ✅ AGREGADO
        };
      }

      let enrichedCount = 0;
      const errors: Array<{ dropi_id: number; error: string }> = [];
      const MAX_RETRIES = 1;
      const RATE_LIMIT_BATCH = 10; // Procesar de a 10 producto
      const RATE_LIMIT_DELAY = 61000; // Esperar 61 segundos entre lotes

      // ✅ MEJORA 5: Trackear productos que fallan con 429 para no reintentarlos
      const failed429Products = new Set<number>();

      console.log(`[ENRICH] Pendientes: ${productsToEnrich.length} | Ya completos: ${alreadyComplete} | Omitidos recientes: ${skippedRecentFailures} | Config: ${RATE_LIMIT_BATCH} productos/lote, ${RATE_LIMIT_DELAY / 1000}s entre lotes`);

      // Procesar por lotes
      for (let i = 0; i < productsToEnrich.length; i += RATE_LIMIT_BATCH) {
        const batch = productsToEnrich.slice(i, i + RATE_LIMIT_BATCH);
        const batchNumber = Math.floor(i / RATE_LIMIT_BATCH) + 1;
        const totalBatches = Math.ceil(productsToEnrich.length / RATE_LIMIT_BATCH);
        const remaining = productsToEnrich.length - (i + batch.length);

        // Procesar en paralelo dentro del lote
        const batchPromises = batch.map(async (product) => {
          // VALIDACIÓN PREVIA: Verificar si ya tiene description e images en la BD
          // (por si se pausó y se reanudó el proceso)
          const currentProduct = await prisma.dropiProduct.findUnique({
            where: { id: product.id },
            select: { description: true, descriptionSyncedAt: true, images: true },
          });

          const hasDescription = currentProduct?.description && currentProduct?.descriptionSyncedAt;
          const hasImages = currentProduct?.images && Array.isArray(currentProduct.images) && currentProduct.images.length > 0;

          if (hasDescription && hasImages && !force) {
            return { type: 'skipped' as const, dropiId: product.dropiId };
          }

          let retryCount = 0;
          let success = false;

          // ✅ MEJORA 6: Si este producto ya falló con 429, no intentarlo
          if (failed429Products.has(product.dropiId)) {
            return { type: 'error' as const, dropiId: product.dropiId, error: '429 - Skipped (already failed)' };
          }

          while (retryCount <= MAX_RETRIES && !success) {
            try {
              // Llamar a /products/v2/{id} para obtener información detallada
              const detailData = await this.dropiService.getProductDetail(product.dropiId);

              if (!detailData?.isSuccess || !detailData?.objects) {
                throw new Error('Respuesta inválida de Dropi');
              }

              const detailPayload = detailData.objects;

              // Extraer descripción
              const description = detailPayload.description || null;

              // Extraer todas las fotos (photos[])
              const images = Array.isArray(detailPayload.photos)
                ? detailPayload.photos.map((photo: any) => ({
                    id: photo.id,
                    url: photo.url,
                    urlS3: photo.urlS3,
                    main: photo.main || false,
                    created_at: photo.created_at,
                    updated_at: photo.updated_at,
                  }))
                : null;

              // Actualizar producto con información enriquecida
              // El enrich SOLO trae description e images
              // NO toca variationsData, categoryDropiIds, warehouseProduct, suggestedPrice, userVerified (vienen del raw o no se actualizan)
              await prisma.dropiProduct.update({
                where: {
                  id: product.id,
                },
                data: {
                  description: description,
                  descriptionSyncedAt: new Date(),
                  images: images,
                },
              });

              enrichedCount++;
              success = true;
              return { type: 'success' as const, dropiId: product.dropiId };
            } catch (error: any) {
              // ✅ MEJORA 7: Si es error 429, marcarlo y no reintentar
              const is429Error = error?.message?.includes('429') || 
                                error?.message?.includes('Too Many Attempts') ||
                                error?.status === 429;
              
              if (is429Error) {
                failed429Products.add(product.dropiId);
                // Actualizar lastSyncedAt para que no se intente de nuevo pronto
                try {
                  await prisma.dropiProduct.update({
                    where: { id: product.id },
                    data: { lastSyncedAt: new Date() },
                  });
                } catch (e) { /* ignore */ }
                
                const errorDetail = {
                  dropi_id: product.dropiId,
                  error: '429 - Too Many Attempts (skipped)',
                };
                errors.push(errorDetail);
                console.error(`[ENRICH] ❌ Producto ${product.dropiId}: 429 - Marcado para omitir`);
                return { type: 'error' as const, dropiId: product.dropiId, error: '429 - Too Many Attempts' };
              }

              retryCount++;
              if (retryCount > MAX_RETRIES) {
                const errorDetail = {
                  dropi_id: product.dropiId,
                  error: error?.message || 'Error desconocido',
                };
                errors.push(errorDetail);
                console.error(`[ENRICH] ❌ Producto ${product.dropiId}: ${error?.message}`);
                return { type: 'error' as const, dropiId: product.dropiId, error: error?.message };
              } else {
                // Esperar antes de reintentar (exponential backoff)
                const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          }
          return { type: 'error' as const, dropiId: product.dropiId, error: 'Max retries exceeded' };
        });

        // Esperar a que termine el lote antes de continuar
        const batchResults = await Promise.all(batchPromises);

        // Contar resultados del lote
        const batchEnriched = batchResults.filter(r => r.type === 'success').length;
        const batchSkipped = batchResults.filter(r => r.type === 'skipped').length;
        const batchErrors = batchResults.filter(r => r.type === 'error').length;

        // Resumen del lote
        console.log(`[ENRICH] Lote ${batchNumber}/${totalBatches}: ✅ ${batchEnriched} enriquecidos | ⏭️ ${batchSkipped} ya completos | ❌ ${batchErrors} errores | 📦 ${remaining} restantes`);

        // Rate limiting: esperar entre lotes (excepto en el último lote)
        if (i + RATE_LIMIT_BATCH < productsToEnrich.length) {
          console.log(`[ENRICH] ⏸️ Esperando ${RATE_LIMIT_DELAY / 1000}s antes del siguiente lote...`);
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      }

      console.log(`✅ [ENRICH] Completado: ${enrichedCount} enriquecidos | ${errors.length} errores | ${alreadyComplete} ya completos`);

      // ✅ AGREGADO: Calcular remaining
      const remaining = Math.max(0, totalPending - enrichedCount);

      return {
        success: true,
        message: 'Enriquecimiento ejecutado',
        enriched: enrichedCount,
        errors: errors.length,
        error_details: errors.slice(0, 10), // Solo primeros 10 errores
        total_pending: totalPending, // ✅ AGREGADO
        remaining: remaining, // ✅ AGREGADO
      };
    } catch (error: any) {
      console.error(`❌ [ENRICH] Error fatal:`, error);
      throw error;
    }
  }
}
