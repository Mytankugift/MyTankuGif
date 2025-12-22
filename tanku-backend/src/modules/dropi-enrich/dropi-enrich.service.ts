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
  }> {
    console.log(`\n🔍 [ENRICH] Iniciando enriquecimiento`);
    console.log(`🔍 [ENRICH] limit: ${limit}, priority: ${priority}, batch_size: ${batchSize}, force: ${force}`);

    try {
      // Buscar productos
      const allProducts = await prisma.dropiProduct.findMany({
        orderBy: {
          createdAt: 'asc',
        },
      });

      console.log(`[ENRICH] Total de productos en dropi_product: ${allProducts.length}`);

      // Aplicar prioridad ANTES de filtrar por descripción
      let productsToProcess = allProducts;

      if (priority === 'active') {
        // En Prisma, no tenemos campo 'active', pero podemos filtrar por otros criterios
        // Por ahora, procesamos todos
        productsToProcess = productsToProcess;
        console.log(`[ENRICH] Productos activos: ${productsToProcess.length}`);
      } else if (priority === 'high_stock') {
        productsToProcess = productsToProcess.sort((a, b) => {
          const stockA = a.stock || 0;
          const stockB = b.stock || 0;
          return stockB - stockA;
        });
      }

      // Limitar cantidad ANTES de filtrar por descripción
      productsToProcess = productsToProcess.slice(0, limit);
      console.log(`[ENRICH] Primeros ${limit} productos seleccionados (según prioridad): ${productsToProcess.length}`);

      // Filtrar cuáles necesitan enriquecimiento
      // Validar que NO tenga description E images (ambos deben estar presentes para omitir)
      let productsToEnrich = productsToProcess;
      if (!force) {
        productsToEnrich = productsToProcess.filter((p) => {
          const hasDescription = p.description && p.descriptionSyncedAt;
          const hasImages = p.images && Array.isArray(p.images) && p.images.length > 0;
          // Solo omitir si tiene AMBOS (description e images)
          return !(hasDescription && hasImages);
        });
        console.log(`[ENRICH] Productos sin descripción o imágenes: ${productsToEnrich.length}`);
      } else {
        console.log(`[ENRICH] Modo force: enriqueciendo todos los productos seleccionados`);
      }

      if (productsToEnrich.length === 0) {
        return {
          success: true,
          message: 'No hay productos pendientes de enriquecer',
          enriched: 0,
          errors: 0,
          error_details: [],
        };
      }

      let enrichedCount = 0;
      const errors: Array<{ dropi_id: number; error: string }> = [];
      const MAX_RETRIES = 3;
      const RATE_LIMIT_BATCH = 10; // Procesar de a 10 productos
      const RATE_LIMIT_DELAY = 60000; // Esperar 60 segundos cada 10 productos

      // Procesar por lotes de 10 (rate limiting)
      for (let i = 0; i < productsToEnrich.length; i += RATE_LIMIT_BATCH) {
        const batch = productsToEnrich.slice(i, i + RATE_LIMIT_BATCH);
        const batchNumber = Math.floor(i / RATE_LIMIT_BATCH) + 1;
        console.log(`[ENRICH] Procesando lote ${batchNumber} (${batch.length} productos)`);

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
            console.log(`[ENRICH]   ⏭️  Producto ${product.dropiId} ya tiene description e images, omitiendo...`);
            return; // Omitir este producto
          }

          let retryCount = 0;
          let success = false;

          while (retryCount <= MAX_RETRIES && !success) {
            try {
              console.log(`[ENRICH]   Procesando producto ${product.dropiId} (intento ${retryCount + 1})`);

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

              console.log(`[ENRICH]   ✅ Producto ${product.dropiId} enriquecido`);
              enrichedCount++;
              success = true;
            } catch (error: any) {
              retryCount++;
              if (retryCount > MAX_RETRIES) {
                console.error(`[ENRICH]   ❌ Error después de ${MAX_RETRIES} intentos para producto ${product.dropiId}:`, error?.message);
                errors.push({
                  dropi_id: product.dropiId,
                  error: error?.message || 'Error desconocido',
                });
              } else {
                // Esperar antes de reintentar (exponential backoff)
                const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
                console.warn(`[ENRICH]   ⚠️ Error en intento ${retryCount}, reintentando en ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          }
        });

        // Esperar a que termine el lote antes de continuar
        await Promise.all(batchPromises);

        // Rate limiting: esperar 60 segundos cada 10 productos (excepto en el último lote)
        if (i + RATE_LIMIT_BATCH < productsToEnrich.length) {
          console.log(`[ENRICH] ⏸️  Esperando ${RATE_LIMIT_DELAY / 1000} segundos antes del siguiente lote (rate limiting)...`);
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      }

      console.log(`✅ [ENRICH] Enriquecimiento completado: ${enrichedCount} productos, ${errors.length} errores`);

      return {
        success: true,
        message: 'Enriquecimiento ejecutado',
        enriched: enrichedCount,
        errors: errors.length,
        error_details: errors.slice(0, 10), // Solo primeros 10 errores
      };
    } catch (error: any) {
      console.error(`❌ [ENRICH] Error fatal:`, error);
      throw error;
    }
  }
}
