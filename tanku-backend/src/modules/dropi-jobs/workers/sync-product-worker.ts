import { BaseWorker } from './base-worker';
import { DropiJobType } from '@prisma/client';
import { DropiSyncService } from '../../dropi-sync/dropi-sync.service';
import { DropiRawService } from '../../dropi-raw/dropi-raw.service';

/**
 * Worker para procesar jobs SYNC_PRODUCT
 * Sincroniza productos desde DropiProduct a Product/ProductVariant
 * No crea otro job (es el final del flujo RAW → NORMALIZE → ENRICH → SYNC_PRODUCT)
 */
export class SyncProductWorker extends BaseWorker {
  private dropiSyncService: DropiSyncService;
  private dropiRawService: DropiRawService;

  constructor() {
    super(DropiJobType.SYNC_PRODUCT);
    this.dropiSyncService = new DropiSyncService();
    this.dropiRawService = new DropiRawService();
  }

  protected async processJob(jobId: string): Promise<void> {
    console.log(`[SYNC_PRODUCT WORKER] Procesando job ${jobId}`);

    let offset = 0;
    const batchSize = 50;
    let hasMore = true;
    let totalProductsExcluded = 0;
    let totalProductsIncluded = 0;
    let totalProductsCreated = 0;
    let totalProductsUpdated = 0;

    try {
      // Verificar cancelación antes de empezar
      if (await this.isJobCancelled(jobId)) {
        throw new Error('Job cancelado antes de iniciar');
      }

      const catalogDropiIds = await this.dropiRawService.getLatestCatalogDropiIds();
      console.log(
        `[SYNC_PRODUCT WORKER] Catálogo actual: ${catalogDropiIds.length} dropiIds`
      );

      while (hasMore) {
        // ⚠️ VERIFICAR CANCELACIÓN ANTES DE CADA BATCH
        if (await this.isJobCancelled(jobId)) {
          console.log(`[SYNC_PRODUCT WORKER] ⚠️ Job ${jobId} fue cancelado, deteniendo procesamiento`);
          throw new Error('Job cancelado por el usuario');
        }

        // Procesar batch de sincronización
        const result = await this.dropiSyncService.syncToBackend(
          batchSize,
          offset,
          true, // activeOnly
          false, // skipExisting — propaga description/images a products
          catalogDropiIds.length > 0 ? catalogDropiIds : undefined
        );

        console.log(`[SYNC_PRODUCT WORKER] Batch sincronizado: ${result.products_created} creados, ${result.products_updated} actualizados`);

        totalProductsCreated += result.products_created;
        totalProductsUpdated += result.products_updated;

        // Acumular contadores de productos incluidos/excluidos
        if (result.products_excluded_no_stock !== undefined) {
          totalProductsExcluded += result.products_excluded_no_stock;
        }
        if (result.products_included_with_stock !== undefined) {
          totalProductsIncluded += result.products_included_with_stock;
        }

        if (result.next_offset === null) {
          hasMore = false;
        } else {
          offset = result.next_offset;
        }

        // Actualizar progreso
        const progress = result.total > 0
          ? Math.round(((result.total - result.remaining) / result.total) * 100)
          : 100;
        await this.updateProgress(jobId, progress);
      }

      // Verificar cancelación antes de finalizar
      if (await this.isJobCancelled(jobId)) {
        throw new Error('Job cancelado antes de finalizar');
      }

      const totalProductsProcessed = totalProductsIncluded + totalProductsExcluded;

      await this.updateJobMetadata(jobId, {
        productsCreated: totalProductsCreated,
        productsUpdated: totalProductsUpdated,
        productsIncludedWithStock: totalProductsIncluded,
        productsExcludedNoStock: totalProductsExcluded,
      });
      await this.updateProgress(jobId, 100);

      console.log(`[SYNC_PRODUCT WORKER] Sincronización completada`);
      console.log(`[SYNC_PRODUCT WORKER] Total productos evaluados: ${totalProductsProcessed} (${totalProductsIncluded} incluidos + ${totalProductsExcluded} excluidos)`);
      console.log(`[SYNC_PRODUCT WORKER] ✅ Productos que QUEDARON en ranking (stock >= 30): ${totalProductsIncluded}`);
      console.log(`[SYNC_PRODUCT WORKER] ❌ Productos que NO quedaron en ranking (stock < 30): ${totalProductsExcluded}`);
    } catch (error: any) {
      // Si el error es por cancelación, no lanzarlo como error fatal
      if (error?.message?.includes('cancelado')) {
        console.log(`[SYNC_PRODUCT WORKER] ⚠️ Job ${jobId} cancelado: ${error.message}`);
        return; // No lanzar error si fue cancelado
      }
      console.error(`[SYNC_PRODUCT WORKER] ❌ Error: ${error?.message}`);
      throw error;
    }
  }
}
