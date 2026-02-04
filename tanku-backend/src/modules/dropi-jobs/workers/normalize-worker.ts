import { BaseWorker } from './base-worker';
import { DropiJobType } from '@prisma/client';
import { DropiNormalizeService } from '../../dropi-normalize/dropi-normalize.service';

/**
 * Worker para procesar jobs NORMALIZE
 * No crea jobs automáticamente - cada proceso se activa manualmente
 */
export class NormalizeWorker extends BaseWorker {
  private dropiNormalizeService: DropiNormalizeService;

  constructor() {
    super(DropiJobType.NORMALIZE);
    this.dropiNormalizeService = new DropiNormalizeService();
  }

  protected async processJob(jobId: string): Promise<void> {
    console.log(`[NORMALIZE WORKER] Procesando job ${jobId}`);

    let offset = 0;
    const batchSize = 100;
    let hasMore = true;

    try {
      // Verificar cancelación antes de empezar
      if (await this.isJobCancelled(jobId)) {
        throw new Error('Job cancelado antes de iniciar');
      }

      while (hasMore) {
        // ⚠️ VERIFICAR CANCELACIÓN ANTES DE CADA BATCH
        if (await this.isJobCancelled(jobId)) {
          console.log(`[NORMALIZE WORKER] ⚠️ Job ${jobId} fue cancelado, deteniendo procesamiento`);
          throw new Error('Job cancelado por el usuario');
        }

        // Procesar batch de normalización
        const result = await this.dropiNormalizeService.normalizeProducts(
          batchSize,
          offset,
          undefined,
          false
        );

        console.log(`[NORMALIZE WORKER] Batch procesado: ${result.normalized} productos normalizados`);

        if (result.next_offset === null) {
          hasMore = false;
        } else {
          offset = result.next_offset;
        }

        // Actualizar progreso
        const progress = result.total_pending > 0
          ? Math.round(((result.total_pending - result.remaining) / result.total_pending) * 100)
          : 100;
        await this.updateProgress(jobId, progress);
      }

      // Verificar cancelación antes de finalizar
      if (await this.isJobCancelled(jobId)) {
        throw new Error('Job cancelado antes de finalizar');
      }

      console.log(`[NORMALIZE WORKER] Normalización completada`);

      // ❌ REMOVIDO: No crear job ENRICH automáticamente
      // Cada proceso se activa manualmente desde tanku-admin
    } catch (error: any) {
      // Si el error es por cancelación, no lanzarlo como error fatal
      if (error?.message?.includes('cancelado')) {
        console.log(`[NORMALIZE WORKER] ⚠️ Job ${jobId} cancelado: ${error.message}`);
        return; // No lanzar error si fue cancelado
      }
      console.error(`[NORMALIZE WORKER] ❌ Error: ${error?.message}`);
      throw error;
    }
  }
}
