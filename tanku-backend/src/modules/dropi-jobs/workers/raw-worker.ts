import { BaseWorker } from './base-worker';
import { DropiJobType } from '@prisma/client';
import { DropiRawService } from '../../dropi-raw/dropi-raw.service';

/**
 * Worker para procesar jobs RAW
 * Delega en DropiRawService (catálogo completo + limpieza por syncRunId al éxito)
 */
export class RawWorker extends BaseWorker {
  private dropiRawService: DropiRawService;

  constructor() {
    super(DropiJobType.RAW);
    this.dropiRawService = new DropiRawService();
  }

  protected async processJob(jobId: string): Promise<void> {
    console.log(`[RAW WORKER] Procesando job ${jobId}`);

    try {
      if (await this.isJobCancelled(jobId)) {
        throw new Error('Job cancelado antes de iniciar');
      }

      await this.dropiRawService.syncRawProducts(0, null, {
        favorite: true,
        shouldAbort: () => this.isJobCancelled(jobId),
        onProgress: ({ percent }) => this.updateProgress(jobId, percent),
      });

      console.log(`[RAW WORKER] Sync RAW completado`);
    } catch (error: any) {
      if (error?.message?.includes('cancelado')) {
        console.log(`[RAW WORKER] Job ${jobId} cancelado: ${error.message}`);
        return;
      }
      console.error(`[RAW WORKER] Error: ${error?.message}`);
      throw error;
    }
  }
}
