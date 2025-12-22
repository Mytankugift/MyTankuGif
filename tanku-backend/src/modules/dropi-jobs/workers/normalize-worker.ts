import { BaseWorker } from './base-worker';
import { DropiJobType } from '@prisma/client';
import { DropiNormalizeService } from '../../dropi-normalize/dropi-normalize.service';

/**
 * Worker para procesar jobs NORMALIZE
 * Al completar, crea un job ENRICH
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

    while (hasMore) {
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

    console.log(`[NORMALIZE WORKER] Normalización completada`);

    // Crear job ENRICH para que continúe el flujo
    await this.dropiJobsService.createJob(DropiJobType.ENRICH);
    console.log(`[NORMALIZE WORKER] Job ENRICH creado`);
  }
}
