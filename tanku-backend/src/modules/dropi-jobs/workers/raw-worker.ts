import { BaseWorker } from './base-worker';
import { DropiJobType } from '@prisma/client';
import { DropiService } from '../../dropi/dropi.service';
import { prisma } from '../../../config/database';

/**
 * Worker para procesar jobs RAW
 * No crea jobs automáticamente - cada proceso se activa manualmente
 */
export class RawWorker extends BaseWorker {
  private dropiService: DropiService;

  constructor() {
    super(DropiJobType.RAW);
    this.dropiService = new DropiService();
  }

  protected async processJob(jobId: string): Promise<void> {
    console.log(`[RAW WORKER] Procesando job ${jobId}`);

    const pageSize = 40; // Fijo según Dropi API
    const categoryId = 1; // Fijo según configuración
    let totalCount = 0;
    let totalProcessed = 0;
    let startData = 0;
    let pageNumber = 0;

    try {
      // Verificar cancelación antes de empezar
      if (await this.isJobCancelled(jobId)) {
        throw new Error('Job cancelado antes de iniciar');
      }

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

      console.log(`[RAW WORKER] Total de productos en Dropi: ${totalCount}`);

      // Guardar primera página
      if (firstPageProducts.length > 0) {
        // Verificar cancelación antes de guardar
        if (await this.isJobCancelled(jobId)) {
          throw new Error('Job cancelado durante el procesamiento');
        }

        await this.saveRawProducts(firstPageProducts, 'index');
        totalProcessed += firstPageProducts.length;
        
        // Actualizar progreso
        const progress = totalCount > 0 
          ? Math.round((totalProcessed / totalCount) * 100) 
          : 0;
        await this.updateProgress(jobId, progress);
        
        // ✅ Log solo en primera página
        console.log(`[RAW WORKER] ✅ Página ${pageNumber + 1}: ${firstPageProducts.length} productos | Progreso: ${progress}%`);
        pageNumber++;
      }

      // Loop para las siguientes páginas
      startData += pageSize;
      let lastLoggedProgress = 0;
      while (startData < totalCount) {
        // ⚠️ VERIFICAR CANCELACIÓN ANTES DE CADA PÁGINA
        if (await this.isJobCancelled(jobId)) {
          console.log(`[RAW WORKER] ⚠️ Job ${jobId} fue cancelado, deteniendo procesamiento`);
          throw new Error('Job cancelado por el usuario');
        }

        const page = await this.dropiService.listProducts({
          pageSize,
          startData,
          category_id: categoryId,
        });

        if (!page?.isSuccess || !Array.isArray(page.objects) || page.objects.length === 0) {
          console.log(`[RAW WORKER] ⚠️ No hay más productos en página ${pageNumber + 1}, terminando`);
          break;
        }

        // Guardar productos
        await this.saveRawProducts(page.objects, 'index');
        totalProcessed += page.objects.length;

        // Actualizar progreso después de cada página
        const progress = totalCount > 0 
          ? Math.min(Math.round((totalProcessed / totalCount) * 100), 100)
          : 0;
        await this.updateProgress(jobId, progress);

        // ✅ SOLO log cada 10 páginas o en hitos importantes (10%, 25%, 50%, 75%, 100%)
        const shouldLog = (pageNumber % 10 === 0) || 
                          (progress >= 10 && lastLoggedProgress < 10) ||
                          (progress >= 25 && lastLoggedProgress < 25) ||
                          (progress >= 50 && lastLoggedProgress < 50) ||
                          (progress >= 75 && lastLoggedProgress < 75) ||
                          (progress >= 100 && lastLoggedProgress < 100);

        if (shouldLog) {
          const remaining = totalCount - totalProcessed;
          const pagesRemaining = Math.ceil(remaining / pageSize);
          console.log(`[RAW WORKER] ✅ Página ${pageNumber + 1}: ${page.objects.length} productos | Total: ${totalProcessed}/${totalCount} | Progreso: ${progress}% | Faltan: ${pagesRemaining} páginas`);
          lastLoggedProgress = progress;
        }

        startData += pageSize;
        pageNumber++;
      }

      // Verificar cancelación antes de finalizar
      if (await this.isJobCancelled(jobId)) {
        throw new Error('Job cancelado antes de finalizar');
      }

      // Asegurar que el progreso esté en 100% al finalizar
      await this.updateProgress(jobId, 100);

      console.log(`[RAW WORKER] Sync RAW completado: ${totalProcessed} productos en ${pageNumber} páginas`);

      // ❌ REMOVIDO: No crear job NORMALIZE automáticamente
      // Cada proceso se activa manualmente desde tanku-admin
    } catch (error: any) {
      // Si el error es por cancelación, no lanzarlo como error fatal
      if (error?.message?.includes('cancelado')) {
        console.log(`[RAW WORKER] ⚠️ Job ${jobId} cancelado: ${error.message}`);
        return; // No lanzar error si fue cancelado
      }
      console.error(`[RAW WORKER] ❌ Error: ${error?.message}`);
      throw error;
    }
  }

  /**
   * Guardar productos RAW en la base de datos
   * Reutiliza la lógica de DropiRawService
   */
  private async saveRawProducts(products: any[], source: string): Promise<void> {
    const now = new Date();

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
        console.warn(`[RAW WORKER] Error en upsert para producto ${product.id}:`, error?.message);
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
          if (createError?.code === 'P2002') {
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
