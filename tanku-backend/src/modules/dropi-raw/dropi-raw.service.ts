import { prisma } from '../../config/database';
import { DropiService } from '../dropi/dropi.service';

export class DropiRawService {
  private dropiService: DropiService;

  constructor() {
    this.dropiService = new DropiService();
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

    let totalCount = 0;
    let totalProcessed = 0;
    let startData = startPage * pageSize;
    let pageNumber = startPage;

    console.log(`\n[SYNC RAW] Iniciando sincronización`);
    console.log(`[SYNC RAW] Página inicial: ${startPage}, startData: ${startData}`);

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

      console.log(`[SYNC RAW] Total de productos en Dropi: ${totalCount}`);
      console.log(`[SYNC RAW] Productos en primera página: ${firstPageProducts.length}`);

      // Guardar primera página
      if (firstPageProducts.length > 0) {
        await this.saveRawProducts(firstPageProducts, 'index');
        totalProcessed += firstPageProducts.length;
        console.log(`[SYNC RAW] ✅ Página ${pageNumber + 1}: ${firstPageProducts.length} productos guardados | Total acumulado: ${totalProcessed}/${totalCount}`);
        pageNumber++;
      }

      // Loop para las siguientes páginas
      startData += pageSize;
      while (startData < totalCount && (maxPages === null || pageNumber < startPage + maxPages)) {
        const page = await this.dropiService.listProducts({
          pageSize,
          startData,
          category_id: categoryId,
        });

        if (!page?.isSuccess || !Array.isArray(page.objects) || page.objects.length === 0) {
          console.log(`[SYNC RAW] ⚠️ No hay más productos en página ${pageNumber + 1}, terminando`);
          break;
        }

        // Guardar productos
        await this.saveRawProducts(page.objects, 'index');

        totalProcessed += page.objects.length;
        const remaining = totalCount - totalProcessed;
        const pagesRemaining = Math.ceil(remaining / pageSize);

        console.log(`[SYNC RAW] ✅ Página ${pageNumber + 1}: ${page.objects.length} productos guardados | Total: ${totalProcessed}/${totalCount} | Faltan: ${pagesRemaining} páginas (${remaining} productos)`);

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
        has_more: startData < totalCount,
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
