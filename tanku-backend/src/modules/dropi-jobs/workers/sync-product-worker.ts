import { BaseWorker } from './base-worker';
import { DropiJobType } from '@prisma/client';
import { DropiSyncService } from '../../dropi-sync/dropi-sync.service';

/**
 * Worker para procesar jobs SYNC_PRODUCT
 * Sincroniza productos desde DropiProduct a Product/ProductVariant
 * No crea otro job (es el final del flujo RAW → NORMALIZE → ENRICH → SYNC_PRODUCT)
 */
export class SyncProductWorker extends BaseWorker {
  private dropiSyncService: DropiSyncService;

  constructor() {
    super(DropiJobType.SYNC_PRODUCT);
    this.dropiSyncService = new DropiSyncService();
  }

  protected async processJob(jobId: string): Promise<void> {
    console.log(`[SYNC_PRODUCT WORKER] Procesando job ${jobId}`);

    let offset = 0;
    const batchSize = 50;
    let hasMore = true;

    try {
      // Verificar cancelación antes de empezar
      if (await this.isJobCancelled(jobId)) {
        throw new Error('Job cancelado antes de iniciar');
      }

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
          false // skipExisting
        );

        console.log(`[SYNC_PRODUCT WORKER] Batch sincronizado: ${result.products_created} creados, ${result.products_updated} actualizados`);

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

      console.log(`[SYNC_PRODUCT WORKER] Sincronización completada`);
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
