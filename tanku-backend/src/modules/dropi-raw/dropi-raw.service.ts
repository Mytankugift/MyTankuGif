import { prisma } from '../../config/database';
import { DropiService } from '../dropi/dropi.service';

export class DropiRawService {
  private dropiService: DropiService;

  constructor() {
    this.dropiService = new DropiService();
  }

  /**
   * Helper para hacer delay entre peticiones
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sincronizar productos RAW desde Dropi
   * Guarda el JSON crudo en DropiRawProduct
   * 
   * @param startPage Página inicial (default: 0)
   * @param maxPages Máximo de páginas a procesar (null = todas)
   * @returns Estadísticas de sincronización
   */
  async syncRawProducts(startPage: number = 0, maxPages: number | null = null): Promise<{
    success: boolean;
    message: string;
    processed: number;
    total: number;
    pages_processed: number;
    next_start_page: number;
    has_more: boolean;
  }> {
    const pageSize = 40; // Fijo según Dropi API
    const categoryId = 1; // Fijo según configuración
    const DELAY_BETWEEN_REQUESTS = 2000; // ✅ 2 segundos entre peticiones (conservador para evitar 429)
    const MAX_RETRIES = 5; // ✅ Más reintentos
    const INITIAL_RETRY_DELAY = 3000; // ✅ 3 segundos inicial para retry

    let totalCount = 0;
    let totalProcessed = 0;
    let startData = startPage * pageSize;
    let pageNumber = startPage;

    console.log(`\n[SYNC RAW] Iniciando sincronización`);
    console.log(`[SYNC RAW] Página inicial: ${startPage}, startData: ${startData}`);
    console.log(`[SYNC RAW] Delay entre peticiones: ${DELAY_BETWEEN_REQUESTS}ms`);

    try {
      // Primera llamada para obtener el total
      const firstPage = await this.dropiService.listProducts({
        pageSize,
        startData,
        category_id: categoryId,
      });

      if (!firstPage?.isSuccess) {
        throw new Error(
          `Dropi API returned isSuccess: false. Message: ${firstPage?.message || "N/A"}`
        );
      }

      totalCount = firstPage.count || 0;
      const firstPageProducts = firstPage.objects || [];

      // ✅ Calcular total de páginas estimadas
      const estimatedTotalPages = totalCount > 0 
        ? Math.ceil(totalCount / pageSize) 
        : null;

      console.log(`[SYNC RAW] Total de productos en Dropi: ${totalCount}`);
      console.log(`[SYNC RAW] Productos en primera página: ${firstPageProducts.length}`);
      if (estimatedTotalPages) {
        console.log(`[SYNC RAW] Total estimado de páginas: ${estimatedTotalPages}`);
      }

      // Guardar primera página
      if (firstPageProducts.length > 0) {
        await this.saveRawProducts(firstPageProducts, 'index');
        totalProcessed += firstPageProducts.length;
        console.log(`[SYNC RAW] ✅ Página ${pageNumber + 1}: ${firstPageProducts.length} productos guardados | Total acumulado: ${totalProcessed}/${totalCount}`);
        pageNumber++;
      }

      // Loop para las siguientes páginas
      startData += pageSize;
      while (true) {
        // Verificar límite de páginas si está definido
        if (maxPages !== null && pageNumber >= startPage + maxPages) {
          break;
        }
        
        // Si tenemos un total válido, verificar si ya llegamos al final
        if (totalCount > 0 && startData >= totalCount) {
          break;
        }

        // ✅ DELAY ANTES DE CADA PETICIÓN (excepto la primera)
        await this.delay(DELAY_BETWEEN_REQUESTS);

        let page;
        let retries = 0;

        // ✅ Retry con backoff exponencial para errores 429
        while (retries <= MAX_RETRIES) {
          try {
            page = await this.dropiService.listProducts({
              pageSize,
              startData,
              category_id: categoryId,
            });

            // Si es 429, esperar y reintentar
            if (page?.status === 429 || (page?.message && page.message.includes('Too Many Attempts'))) {
              retries++;
              if (retries > MAX_RETRIES) {
                throw new Error(`Error 429 después de ${MAX_RETRIES} reintentos. Rate limit de Dropi excedido.`);
              }
              const waitTime = INITIAL_RETRY_DELAY * Math.pow(2, retries - 1); // Backoff exponencial
              console.log(`[SYNC RAW] ⚠️ Rate limit (429) detectado. Esperando ${waitTime}ms antes de reintentar (intento ${retries}/${MAX_RETRIES})...`);
              await this.delay(waitTime);
              continue;
            }

            // Si no es 429, salir del loop de retry
            break;
          } catch (error: any) {
            // Si el error contiene 429, reintentar
            if (error?.message?.includes('429') || error?.message?.includes('Too Many Attempts')) {
              retries++;
              if (retries > MAX_RETRIES) {
                throw error;
              }
              const waitTime = INITIAL_RETRY_DELAY * Math.pow(2, retries - 1);
              console.log(`[SYNC RAW] ⚠️ Error 429 capturado. Esperando ${waitTime}ms antes de reintentar (intento ${retries}/${MAX_RETRIES})...`);
              await this.delay(waitTime);
              continue;
            }
            // Si es otro error, lanzarlo
            throw error;
          }
        }

        if (!page?.isSuccess || !Array.isArray(page.objects) || page.objects.length === 0) {
          console.log(`[SYNC RAW] ⚠️ No hay más productos en página ${pageNumber + 1}, terminando`);
          break;
        }

        // Guardar productos
        await this.saveRawProducts(page.objects, 'index');

        totalProcessed += page.objects.length;
        const remaining = totalCount > 0 ? totalCount - totalProcessed : 0;
        const pagesRemaining = totalCount > 0 ? Math.ceil(remaining / pageSize) : 0;

        // ✅ Mejorar el log para mostrar progreso más claro
        if (estimatedTotalPages) {
          console.log(`[SYNC RAW] ✅ Página ${pageNumber + 1}/${estimatedTotalPages}: ${page.objects.length} productos guardados | Total: ${totalProcessed}/${totalCount} | Faltan: ${pagesRemaining} páginas (${remaining} productos)`);
        } else {
          console.log(`[SYNC RAW] ✅ Página ${pageNumber + 1}: ${page.objects.length} productos guardados | Total: ${totalProcessed} | Continuando...`);
        }

        startData += pageSize;
        pageNumber++;
      }

      console.log(`[SYNC RAW] ✅ Sincronización completada`);
      console.log(`[SYNC RAW] Total procesado: ${totalProcessed} productos en ${pageNumber - startPage} páginas`);

      return {
        success: true,
        message: 'Sync RAW ejecutado',
        processed: totalProcessed,
        total: totalCount,
        pages_processed: pageNumber - startPage,
        next_start_page: pageNumber,
        has_more: totalCount > 0 ? startData < totalCount : false, // Si totalCount es 0, asumimos que no hay más
      };
    } catch (error: any) {
      console.error(`[SYNC RAW] ❌ Error: ${error?.message}`);
      throw error;
    }
  }

  /**
   * Guardar productos RAW en la base de datos
   * Usa upsert para actualizar si ya existe
   */
  private async saveRawProducts(products: any[], source: string): Promise<void> {
    const now = new Date();

    // Usar createMany con skipDuplicates o upsert individual
    // Prisma no soporta upsert en createMany, así que hacemos upsert individual
    // El constraint único es [dropiId, source]
    for (const product of products) {
      try {
        await prisma.dropiRawProduct.upsert({
          where: {
            dropiId_source: {
              dropiId: product.id,
              source: source,
            },
          },
          create: {
            dropiId: product.id,
            source: source,
            payload: product as any,
            syncedAt: now,
          },
          update: {
            payload: product as any,
            syncedAt: now,
            updatedAt: now,
          },
        });
      } catch (error: any) {
        // Si falla el upsert, intentar crear directamente
        // Esto puede pasar si el constraint único no está definido correctamente
        console.warn(`[SYNC RAW] Error en upsert para producto ${product.id}, intentando create:`, error?.message);
        try {
          await prisma.dropiRawProduct.create({
            data: {
              dropiId: product.id,
              source: source,
              payload: product as any,
              syncedAt: now,
            },
          });
        } catch (createError: any) {
          // Si ya existe, ignorar
          if (createError?.code === 'P2002') {
            console.log(`[SYNC RAW] Producto ${product.id} ya existe, actualizando...`);
            await prisma.dropiRawProduct.updateMany({
              where: {
                dropiId: product.id,
                source: source,
              },
              data: {
                payload: product as any,
                syncedAt: now,
                updatedAt: now,
              },
            });
          } else {
            throw createError;
          }
        }
      }
    }
  }
}
